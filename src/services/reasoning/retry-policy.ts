/**
 * Retry and Reframing Policy Layer
 * Controls retry behavior through structured state transitions
 */

import type {
  RetryState,
  RetryStateKind,
  RetryPolicyState,
  RetryBudget,
  RetryTrigger,
  RetryPolicyInput,
  RetryPolicyOutput,
  RetryAction,
  RetryTransform,
  ContextDelta,
  SubTask,
  AttemptRecord,
  ExhaustionReason,
  EscalationContext,
  DeficiencyTag,
} from "@/types/reasoning";

import {
  RETRY_LIMITS,
  RETRY_TIER_ORDER,
  TASK_SEGMENT_PATTERNS,
} from "@constants/reasoning";

import { generateId, createTimestamp } from "@services/reasoning/utils";

// =============================================================================
// STATE MACHINE INITIALIZATION
// =============================================================================

export function createInitialRetryState(): RetryPolicyState {
  return {
    currentState: { kind: "INITIAL", attempts: 0, tierAttempts: 0 },
    totalAttempts: 0,
    history: [],
    budget: createRetryBudget(),
  };
}

export function createRetryBudget(
  overrides?: Partial<RetryBudget>,
): RetryBudget {
  return {
    maxTotalAttempts: RETRY_LIMITS.maxTotalAttempts,
    maxPerTier: RETRY_LIMITS.maxPerTier,
    maxTimeMs: RETRY_LIMITS.maxTimeMs,
    startTime: createTimestamp(),
    ...overrides,
  };
}

// =============================================================================
// STATE TRANSITION LOGIC
// =============================================================================

export function computeRetryTransition(
  input: RetryPolicyInput,
): RetryPolicyOutput {
  const { currentState, trigger, availableTools, contextBudget } = input;
  const { budget, history } = currentState;

  if (isExhausted(currentState, budget)) {
    return createExhaustedOutput(
      currentState,
      getExhaustionReason(currentState, budget),
    );
  }

  const attemptRecord = createAttemptRecord(
    trigger,
    currentState.totalAttempts + 1,
  );
  const newHistory = [...history, attemptRecord];

  const nextState = computeNextState(
    currentState.currentState,
    trigger,
    budget,
    availableTools,
    contextBudget,
  );

  const action = computeAction(nextState, currentState.currentState, trigger);

  return {
    nextState: {
      currentState: nextState,
      totalAttempts: currentState.totalAttempts + 1,
      history: newHistory,
      budget,
    },
    action,
  };
}

function isExhausted(state: RetryPolicyState, budget: RetryBudget): boolean {
  if (state.totalAttempts >= budget.maxTotalAttempts) {
    return true;
  }

  const elapsed = createTimestamp() - budget.startTime;
  if (elapsed >= budget.maxTimeMs) {
    return true;
  }

  return state.currentState.kind === "EXHAUSTED";
}

function getExhaustionReason(
  state: RetryPolicyState,
  budget: RetryBudget,
): ExhaustionReason {
  if (state.totalAttempts >= budget.maxTotalAttempts) {
    return "MAX_ATTEMPTS_EXCEEDED";
  }

  const elapsed = createTimestamp() - budget.startTime;
  if (elapsed >= budget.maxTimeMs) {
    return "TIME_BUDGET_EXCEEDED";
  }

  return "MAX_TIERS_EXCEEDED";
}

// =============================================================================
// NEXT STATE COMPUTATION
// =============================================================================

function computeNextState(
  current: RetryState,
  trigger: RetryTrigger,
  budget: RetryBudget,
  availableTools: string[],
  _contextBudget: number,
): RetryState {
  // INITIAL is a pre-retry state - first retry always advances to RETRY_SAME
  if (current.kind === "INITIAL") {
    return {
      kind: "RETRY_SAME",
      attempts: 1,
      tierAttempts: 1,
    };
  }

  const tierAttempts = current.tierAttempts + 1;

  if (tierAttempts >= budget.maxPerTier) {
    return advanceToNextTier(current, trigger, availableTools);
  }

  return incrementCurrentTier(current);
}

function incrementCurrentTier(current: RetryState): RetryState {
  return {
    ...current,
    attempts: current.attempts + 1,
    tierAttempts: current.tierAttempts + 1,
  };
}

function advanceToNextTier(
  current: RetryState,
  trigger: RetryTrigger,
  availableTools: string[],
): RetryState {
  type TierKind = (typeof RETRY_TIER_ORDER)[number];
  const currentTierIndex = RETRY_TIER_ORDER.indexOf(current.kind as TierKind);
  const nextTierKind = RETRY_TIER_ORDER[currentTierIndex + 1];

  if (!nextTierKind || nextTierKind === "EXHAUSTED") {
    return {
      kind: "EXHAUSTED",
      attempts: current.attempts + 1,
      tierAttempts: 0,
      exhaustionReason: "MAX_TIERS_EXCEEDED",
    };
  }

  const baseState: RetryState = {
    kind: nextTierKind,
    attempts: current.attempts + 1,
    tierAttempts: 0,
  };

  const tierStateMap: Partial<Record<RetryStateKind, () => RetryState>> = {
    RETRY_SIMPLIFIED: () => ({
      ...baseState,
      removedContext: createContextDelta(trigger),
    }),
    RETRY_DECOMPOSED: () => ({
      ...baseState,
      subTasks: extractSubTasks(trigger),
    }),
    RETRY_ALTERNATIVE: () => ({
      ...baseState,
      alternativeTool: selectAlternativeTool(trigger, availableTools),
    }),
  };

  const stateCreator = tierStateMap[nextTierKind];
  return stateCreator ? stateCreator() : baseState;
}

// =============================================================================
// CONTEXT DELTA CREATION
// =============================================================================

function createContextDelta(_trigger: RetryTrigger): ContextDelta {
  return {
    removedMessageIds: [],
    truncatedResults: [],
    collapsedAttempts: 1,
  };
}

// =============================================================================
// TASK DECOMPOSITION
// =============================================================================

function extractSubTasks(trigger: RetryTrigger): SubTask[] {
  if (trigger.event === "QUALITY_VERDICT") {
    return createDefaultSubTasks();
  }

  if (trigger.event === "TOOL_EXECUTION_FAILED") {
    return [
      {
        id: generateId("subtask"),
        description: `Investigate tool failure: ${trigger.error.message}`,
        dependencies: [],
        status: "PENDING",
      },
      {
        id: generateId("subtask"),
        description: "Retry original task with alternative approach",
        dependencies: [],
        status: "PENDING",
      },
    ];
  }

  return createDefaultSubTasks();
}

function createDefaultSubTasks(): SubTask[] {
  return [
    {
      id: generateId("subtask"),
      description: "Understand the current state",
      dependencies: [],
      status: "PENDING",
    },
    {
      id: generateId("subtask"),
      description: "Make the required change",
      dependencies: [],
      status: "PENDING",
    },
    {
      id: generateId("subtask"),
      description: "Verify the change",
      dependencies: [],
      status: "PENDING",
    },
  ];
}

export function splitTaskDescription(description: string): string[] {
  for (const pattern of TASK_SEGMENT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = description.match(regex);

    if (matches && matches.length > 1) {
      return matches
        .map((m) => m.replace(/^[-•\d.)\s]+/, "").trim())
        .filter((s) => s.length > 0);
    }
  }

  return [description];
}

// =============================================================================
// ALTERNATIVE TOOL SELECTION
// =============================================================================

function selectAlternativeTool(
  trigger: RetryTrigger,
  availableTools: string[],
): string | undefined {
  if (trigger.event !== "TOOL_EXECUTION_FAILED") {
    return undefined;
  }

  const failedTool = trigger.error.toolName;
  const alternatives = availableTools.filter((t) => t !== failedTool);

  const toolAlternatives: Record<string, string[]> = {
    write: ["edit"],
    edit: ["write"],
    bash: [],
    read: ["glob", "grep"],
    glob: ["grep", "bash"],
    grep: ["glob", "bash"],
  };

  const preferredAlternatives = toolAlternatives[failedTool] || [];
  const available = preferredAlternatives.filter((t) =>
    alternatives.includes(t),
  );

  return available[0] || alternatives[0];
}

// =============================================================================
// ACTION COMPUTATION
// =============================================================================

function computeAction(
  nextState: RetryState,
  previousState: RetryState,
  trigger: RetryTrigger,
): RetryAction {
  if (nextState.kind === "EXHAUSTED") {
    const shouldEscalate = shouldEscalateToUser(trigger);

    if (shouldEscalate) {
      return {
        kind: "ESCALATE_TO_USER",
        context: createEscalationContext(trigger, previousState),
      };
    }

    return {
      kind: "ABORT",
      reason: nextState.exhaustionReason || "MAX_TIERS_EXCEEDED",
    };
  }

  if (nextState.kind === "RETRY_DECOMPOSED" && nextState.subTasks) {
    return {
      kind: "DECOMPOSE",
      subTasks: nextState.subTasks,
    };
  }

  if (nextState.kind === "RETRY_ALTERNATIVE" && nextState.alternativeTool) {
    return {
      kind: "SWITCH_TOOL",
      newTool: nextState.alternativeTool,
    };
  }

  const transform = computeTransform(nextState, previousState);

  return {
    kind: "RETRY",
    transform,
  };
}

function computeTransform(
  nextState: RetryState,
  previousState: RetryState,
): RetryTransform {
  if (nextState.kind === previousState.kind) {
    return { kind: "NONE" };
  }

  if (nextState.kind === "RETRY_SIMPLIFIED" && nextState.removedContext) {
    return {
      kind: "REDUCE_CONTEXT",
      delta: nextState.removedContext,
    };
  }

  if (nextState.kind === "RETRY_DECOMPOSED" && nextState.subTasks) {
    return {
      kind: "SPLIT_TASK",
      subTasks: nextState.subTasks,
    };
  }

  if (nextState.kind === "RETRY_ALTERNATIVE" && nextState.alternativeTool) {
    return {
      kind: "SELECT_ALTERNATIVE",
      tool: nextState.alternativeTool,
    };
  }

  return { kind: "NONE" };
}

// =============================================================================
// ESCALATION LOGIC
// =============================================================================

function shouldEscalateToUser(trigger: RetryTrigger): boolean {
  if (trigger.event === "QUALITY_VERDICT") {
    const criticalDeficiencies: DeficiencyTag[] = [
      "QUERY_MISMATCH",
      "HALLUCINATION_MARKER",
    ];
    return trigger.deficiencies.some((d) => criticalDeficiencies.includes(d));
  }

  if (trigger.event === "TOOL_EXECUTION_FAILED") {
    return trigger.error.errorType === "PERMISSION_DENIED";
  }

  return false;
}

function createEscalationContext(
  trigger: RetryTrigger,
  _state: RetryState,
): EscalationContext {
  const reason =
    trigger.event === "QUALITY_VERDICT"
      ? `Response quality issues: ${trigger.deficiencies.join(", ")}`
      : trigger.event === "TOOL_EXECUTION_FAILED"
        ? `Tool execution failed: ${trigger.error.message}`
        : "Validation failed";

  return {
    reason,
    attempts: [],
    suggestedActions: computeSuggestedActions(trigger),
  };
}

function computeSuggestedActions(trigger: RetryTrigger): string[] {
  if (trigger.event === "QUALITY_VERDICT") {
    return [
      "Provide more specific requirements",
      "Break the task into smaller steps",
      "Specify expected output format",
    ];
  }

  if (trigger.event === "TOOL_EXECUTION_FAILED") {
    const actionsByError: Record<string, string[]> = {
      PERMISSION_DENIED: [
        "Grant the required permission",
        "Use a different approach that doesn't require this permission",
      ],
      TIMEOUT: ["Increase the timeout", "Simplify the operation"],
      INVALID_ARGS: [
        "Review the command arguments",
        "Check file paths and names",
      ],
      EXECUTION_ERROR: ["Check the system state", "Try an alternative command"],
    };

    return (
      actionsByError[trigger.error.errorType] || ["Review the error details"]
    );
  }

  return ["Review the validation failures", "Adjust the approach"];
}

// =============================================================================
// ATTEMPT RECORD CREATION
// =============================================================================

function createAttemptRecord(
  trigger: RetryTrigger,
  attemptNumber: number,
): AttemptRecord {
  const baseRecord = {
    attemptNumber,
    timestamp: createTimestamp(),
    score: 0,
  };

  if (trigger.event === "QUALITY_VERDICT") {
    return {
      ...baseRecord,
      verdict: trigger.verdict,
      deficiencies: trigger.deficiencies,
    };
  }

  return {
    ...baseRecord,
    verdict: "RETRY",
    deficiencies: [],
  };
}

// =============================================================================
// EXHAUSTED OUTPUT CREATION
// =============================================================================

function createExhaustedOutput(
  state: RetryPolicyState,
  reason: ExhaustionReason,
): RetryPolicyOutput {
  return {
    nextState: {
      ...state,
      currentState: {
        kind: "EXHAUSTED",
        attempts: state.totalAttempts,
        tierAttempts: 0,
        exhaustionReason: reason,
      },
    },
    action: {
      kind: "ABORT",
      reason,
    },
  };
}

// =============================================================================
// STATE QUERIES
// =============================================================================

export function isRetryable(state: RetryPolicyState): boolean {
  return (
    state.currentState.kind !== "EXHAUSTED" &&
    state.currentState.kind !== "COMPLETE"
  );
}

export function getCurrentTier(state: RetryPolicyState): RetryStateKind {
  return state.currentState.kind;
}

export function getRemainingAttempts(state: RetryPolicyState): number {
  return state.budget.maxTotalAttempts - state.totalAttempts;
}

export function getElapsedTime(state: RetryPolicyState): number {
  return createTimestamp() - state.budget.startTime;
}

export function getRemainingTime(state: RetryPolicyState): number {
  return Math.max(0, state.budget.maxTimeMs - getElapsedTime(state));
}
