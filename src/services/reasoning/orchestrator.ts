/**
 * Reasoning Control Orchestrator
 * Coordinates all cognitive control layers during task execution
 */

import type {
  ReasoningControlState,
  ReasoningTaskResult,
  ExecutionPhase,
  ExecutionMetrics,
  QualityEvalInput,
  QualityEvalOutput,
  RetryPolicyInput,
  RetryAction,
  CompressionInput,
  SelectionInput,
  TerminationState,
  TerminationTrigger,
  TerminationOutput,
  CompressibleMessage,
  MemoryItem,
  TaskConstraints,
  AttemptRecord,
  EntityTable,
} from "@/types/reasoning";

import { DEFAULT_TOKEN_BUDGET } from "@constants/reasoning";

import { evaluateQuality } from "@services/reasoning/quality-evaluation";
import {
  createInitialRetryState,
  computeRetryTransition,
  isRetryable,
} from "@services/reasoning/retry-policy";
import {
  compressContext,
  markMessagesWithAge,
  getPreservationCandidates,
} from "@services/reasoning/context-compression";
import {
  selectRelevantMemories,
  computeMandatoryItems,
  createQueryContext,
  createMemoryItem,
  createMemoryStore,
  addMemory,
  MemoryStore,
} from "@services/reasoning/memory-selection";
import {
  createInitialTerminationState,
  processTerminationTrigger,
  isTerminal,
  requiresValidation,
} from "@services/reasoning/termination-detection";
import {
  createTimestamp,
  estimateTokens,
  tokenize,
  extractEntities,
  createEntityTable,
} from "@services/reasoning/utils";

// =============================================================================
// ORCHESTRATOR STATE
// =============================================================================

export interface OrchestratorConfig {
  tokenBudget: number;
  availableTools: string[];
  autoValidate: boolean;
  maxIterations: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  tokenBudget: DEFAULT_TOKEN_BUDGET,
  availableTools: ["read", "write", "edit", "bash", "glob", "grep"],
  autoValidate: true,
  maxIterations: 20,
};

export function createOrchestratorConfig(
  overrides: Partial<OrchestratorConfig> = {},
): OrchestratorConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

// =============================================================================
// STATE INITIALIZATION
// =============================================================================

export function createInitialState(): ReasoningControlState {
  return {
    retryPolicy: createInitialRetryState(),
    termination: createInitialTerminationState(),
    compressionLevel: "FULL",
    entityTable: createEntityTable([]),
    currentPhase: "CONTEXT_PREPARATION",
    metrics: createInitialMetrics(),
  };
}

function createInitialMetrics(): ExecutionMetrics {
  return {
    totalLLMCalls: 0,
    totalToolExecutions: 0,
    totalRetries: 0,
    totalTokensUsed: 0,
    startTime: createTimestamp(),
    phaseTimings: {
      CONTEXT_PREPARATION: 0,
      LLM_INTERACTION: 0,
      QUALITY_EVALUATION: 0,
      RETRY_DECISION: 0,
      EXECUTION: 0,
      TERMINATION_CHECK: 0,
      VALIDATION: 0,
      COMPLETE: 0,
      FAILED: 0,
    },
  };
}

// =============================================================================
// PHASE 1: CONTEXT PREPARATION
// =============================================================================

export interface ContextPreparationInput {
  query: string;
  memoryStore: MemoryStore;
  existingContext: CompressibleMessage[];
  tokenBudget: number;
  activePaths: string[];
}

export interface ContextPreparationOutput {
  selectedMemories: MemoryItem[];
  compressedContext: CompressibleMessage[];
  entityTable: EntityTable;
  tokenUsage: number;
}

export function prepareContext(
  input: ContextPreparationInput,
  state: ReasoningControlState,
): ContextPreparationOutput {
  const queryContext = createQueryContext(input.query, {
    activePaths: input.activePaths,
  });

  const mandatoryItems = computeMandatoryItems(
    input.memoryStore.items,
    createTimestamp(),
  );

  const selectionInput: SelectionInput = {
    memories: input.memoryStore.items,
    query: queryContext,
    tokenBudget: Math.floor(input.tokenBudget * 0.6),
    mandatoryItems,
  };

  const selectionOutput = selectRelevantMemories(selectionInput);

  const agedMessages = markMessagesWithAge(
    input.existingContext,
    input.existingContext.length,
  );

  const preserveList = getPreservationCandidates(agedMessages);

  const currentTokenCount = estimateTokens(
    agedMessages.map((m) => m.content).join("\n"),
  );

  const compressionInput: CompressionInput = {
    messages: agedMessages,
    toolResults: [],
    entities: state.entityTable,
    currentTokenCount,
    tokenLimit: input.tokenBudget,
    preserveList,
  };

  const compressionOutput = compressContext(compressionInput);

  return {
    selectedMemories: selectionOutput.selected,
    compressedContext: compressionOutput.compressedMessages,
    entityTable: compressionOutput.entityTable,
    tokenUsage:
      selectionOutput.tokenUsage +
      (currentTokenCount - compressionOutput.tokensSaved),
  };
}

// =============================================================================
// PHASE 2: QUALITY EVALUATION
// =============================================================================

export interface QualityEvaluationInput {
  responseText: string;
  responseToolCalls: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  originalQuery: string;
  taskConstraints: TaskConstraints;
  previousAttempts: AttemptRecord[];
}

export function evaluateResponseQuality(
  input: QualityEvaluationInput,
): QualityEvalOutput {
  const queryTokens = tokenize(input.originalQuery);
  const queryEntities = extractEntities(input.originalQuery, "query");

  const expectedType = inferExpectedType(
    input.taskConstraints,
    input.responseToolCalls,
  );

  const evalInput: QualityEvalInput = {
    responseText: input.responseText,
    responseToolCalls: input.responseToolCalls,
    expectedType,
    queryTokens,
    queryEntities,
    previousAttempts: input.previousAttempts,
    taskConstraints: input.taskConstraints,
  };

  return evaluateQuality(evalInput);
}

function inferExpectedType(
  constraints: TaskConstraints,
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>,
): "tool_call" | "text" | "code" | "mixed" {
  if (constraints.expectedToolCalls.length > 0) {
    return "tool_call";
  }

  if (constraints.requiresCode) {
    return "code";
  }

  if (toolCalls.length > 0) {
    return "mixed";
  }

  return "text";
}

// =============================================================================
// PHASE 3: RETRY DECISION
// =============================================================================

export interface RetryDecisionInput {
  qualityOutput: QualityEvalOutput;
  state: ReasoningControlState;
  availableTools: string[];
  contextBudget: number;
}

export interface RetryDecisionOutput {
  shouldRetry: boolean;
  action: RetryAction;
  updatedState: ReasoningControlState;
}

export function decideRetry(input: RetryDecisionInput): RetryDecisionOutput {
  const { qualityOutput, state, availableTools, contextBudget } = input;

  if (qualityOutput.verdict === "ACCEPT") {
    return {
      shouldRetry: false,
      action: { kind: "RETRY", transform: { kind: "NONE" } },
      updatedState: state,
    };
  }

  const retryInput: RetryPolicyInput = {
    currentState: state.retryPolicy,
    trigger: {
      event: "QUALITY_VERDICT",
      verdict: qualityOutput.verdict,
      deficiencies: qualityOutput.deficiencies,
    },
    availableTools,
    contextBudget,
  };

  const retryOutput = computeRetryTransition(retryInput);

  const updatedState: ReasoningControlState = {
    ...state,
    retryPolicy: retryOutput.nextState,
    metrics: {
      ...state.metrics,
      totalRetries: state.metrics.totalRetries + 1,
    },
  };

  const shouldRetry =
    isRetryable(retryOutput.nextState) &&
    retryOutput.action.kind !== "ABORT" &&
    retryOutput.action.kind !== "ESCALATE_TO_USER";

  return {
    shouldRetry,
    action: retryOutput.action,
    updatedState,
  };
}

// =============================================================================
// PHASE 4: TERMINATION CHECK
// =============================================================================

export interface TerminationCheckInput {
  responseText: string;
  hasToolCalls: boolean;
  toolResults: Array<{ name: string; success: boolean }>;
  state: ReasoningControlState;
}

export interface TerminationCheckOutput {
  isTerminal: boolean;
  requiresValidation: boolean;
  terminationState: TerminationState;
  decision: TerminationOutput["decision"];
}

export function checkTermination(
  input: TerminationCheckInput,
): TerminationCheckOutput {
  let currentState = input.state.termination;

  const modelTrigger: TerminationTrigger = {
    event: "MODEL_OUTPUT",
    content: input.responseText,
    hasToolCalls: input.hasToolCalls,
  };

  let output = processTerminationTrigger(currentState, modelTrigger);
  currentState = {
    ...currentState,
    status: output.status,
    completionSignals: output.evidence.signals,
    confidenceScore: output.confidence,
  };

  for (const toolResult of input.toolResults) {
    const toolTrigger: TerminationTrigger = {
      event: "TOOL_COMPLETED",
      toolName: toolResult.name,
      success: toolResult.success,
    };

    output = processTerminationTrigger(currentState, toolTrigger);
    currentState = {
      ...currentState,
      status: output.status,
      completionSignals: output.evidence.signals,
      confidenceScore: output.confidence,
    };
  }

  return {
    isTerminal: isTerminal(currentState),
    requiresValidation: requiresValidation(currentState),
    terminationState: currentState,
    decision: output.decision,
  };
}

// =============================================================================
// FULL EXECUTION CYCLE
// =============================================================================

export interface ExecutionCycleInput {
  query: string;
  memoryStore: MemoryStore;
  existingMessages: CompressibleMessage[];
  taskConstraints: TaskConstraints;
  config: OrchestratorConfig;
  callLLM: (context: CompressibleMessage[]) => Promise<{
    text: string;
    toolCalls: Array<{
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }>;
  }>;
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{
    success: boolean;
    output: string;
  }>;
}

export interface ExecutionCycleOutput {
  result: ReasoningTaskResult;
  updatedMemoryStore: MemoryStore;
  finalState: ReasoningControlState;
}

export async function executeReasoningCycle(
  input: ExecutionCycleInput,
): Promise<ExecutionCycleOutput> {
  let state = createInitialState();
  let memoryStore = input.memoryStore;
  let messages = input.existingMessages;
  let iteration = 0;

  const phaseStart = (phase: ExecutionPhase) => {
    state = { ...state, currentPhase: phase };
    return createTimestamp();
  };

  const phaseEnd = (phase: ExecutionPhase, startTime: number) => {
    state = {
      ...state,
      metrics: {
        ...state.metrics,
        phaseTimings: {
          ...state.metrics.phaseTimings,
          [phase]:
            state.metrics.phaseTimings[phase] + (createTimestamp() - startTime),
        },
      },
    };
  };

  while (iteration < input.config.maxIterations) {
    iteration++;

    const prepStart = phaseStart("CONTEXT_PREPARATION");
    const contextOutput = prepareContext(
      {
        query: input.query,
        memoryStore,
        existingContext: messages,
        tokenBudget: input.config.tokenBudget,
        activePaths: [],
      },
      state,
    );
    state = { ...state, entityTable: contextOutput.entityTable };
    phaseEnd("CONTEXT_PREPARATION", prepStart);

    const llmStart = phaseStart("LLM_INTERACTION");
    const llmResponse = await input.callLLM(contextOutput.compressedContext);
    state = {
      ...state,
      metrics: {
        ...state.metrics,
        totalLLMCalls: state.metrics.totalLLMCalls + 1,
        totalTokensUsed:
          state.metrics.totalTokensUsed + estimateTokens(llmResponse.text),
      },
    };
    phaseEnd("LLM_INTERACTION", llmStart);

    const evalStart = phaseStart("QUALITY_EVALUATION");
    const qualityOutput = evaluateResponseQuality({
      responseText: llmResponse.text,
      responseToolCalls: llmResponse.toolCalls,
      originalQuery: input.query,
      taskConstraints: input.taskConstraints,
      previousAttempts: state.retryPolicy.history,
    });
    phaseEnd("QUALITY_EVALUATION", evalStart);

    if (qualityOutput.verdict !== "ACCEPT") {
      const retryStart = phaseStart("RETRY_DECISION");
      const retryOutput = decideRetry({
        qualityOutput,
        state,
        availableTools: input.config.availableTools,
        contextBudget: input.config.tokenBudget,
      });
      state = retryOutput.updatedState;
      phaseEnd("RETRY_DECISION", retryStart);

      if (!retryOutput.shouldRetry) {
        return createFailedResult(state, memoryStore, retryOutput.action);
      }

      continue;
    }

    const execStart = phaseStart("EXECUTION");
    const toolResults: Array<{
      name: string;
      success: boolean;
      output: string;
    }> = [];

    for (const toolCall of llmResponse.toolCalls) {
      const result = await input.executeTool(toolCall.name, toolCall.arguments);
      toolResults.push({
        name: toolCall.name,
        success: result.success,
        output: result.output,
      });
      state = {
        ...state,
        metrics: {
          ...state.metrics,
          totalToolExecutions: state.metrics.totalToolExecutions + 1,
        },
      };
    }
    phaseEnd("EXECUTION", execStart);

    memoryStore = addMemory(
      memoryStore,
      createMemoryItem(llmResponse.text, "CONVERSATION", {
        filePaths: extractFilePaths(llmResponse.text),
      }),
    );

    for (const result of toolResults) {
      memoryStore = addMemory(
        memoryStore,
        createMemoryItem(result.output, "TOOL_RESULT"),
      );
    }

    const termStart = phaseStart("TERMINATION_CHECK");
    const termOutput = checkTermination({
      responseText: llmResponse.text,
      hasToolCalls: llmResponse.toolCalls.length > 0,
      toolResults: toolResults.map((r) => ({
        name: r.name,
        success: r.success,
      })),
      state,
    });
    state = { ...state, termination: termOutput.terminationState };
    phaseEnd("TERMINATION_CHECK", termStart);

    if (termOutput.isTerminal) {
      return createSuccessResult(state, memoryStore, llmResponse.text);
    }

    if (!termOutput.requiresValidation && llmResponse.toolCalls.length === 0) {
      return createSuccessResult(state, memoryStore, llmResponse.text);
    }

    messages = updateMessages(messages, llmResponse, toolResults);
  }

  return createFailedResult(state, memoryStore, {
    kind: "ABORT",
    reason: "MAX_ITERATIONS_EXCEEDED",
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractFilePaths(text: string): string[] {
  const pathPattern =
    /(?:^|\s|["'`])([\w\-./]+\.[a-z]{1,4})(?:\s|$|:|[()\[\]"'`])/gm;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pathPattern.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)];
}

function updateMessages(
  messages: CompressibleMessage[],
  llmResponse: {
    text: string;
    toolCalls: Array<{
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }>;
  },
  toolResults: Array<{ name: string; success: boolean; output: string }>,
): CompressibleMessage[] {
  const updated = [...messages];

  updated.push({
    id: `msg_${createTimestamp()}`,
    role: "assistant",
    content: llmResponse.text,
    tokenCount: estimateTokens(llmResponse.text),
    age: 0,
    isPreserved: false,
  });

  for (const result of toolResults) {
    updated.push({
      id: `tool_${createTimestamp()}`,
      role: "tool",
      content: result.output,
      tokenCount: estimateTokens(result.output),
      age: 0,
      isPreserved: false,
      metadata: { toolCallId: result.name },
    });
  }

  return updated;
}

function createSuccessResult(
  state: ReasoningControlState,
  memoryStore: MemoryStore,
  finalResponse: string,
): ExecutionCycleOutput {
  return {
    result: {
      status: "COMPLETE",
      confidence: state.termination.confidenceScore,
      outputs: [],
      finalResponse,
      metrics: state.metrics,
      history: state.retryPolicy.history,
    },
    updatedMemoryStore: memoryStore,
    finalState: { ...state, currentPhase: "COMPLETE" },
  };
}

function createFailedResult(
  state: ReasoningControlState,
  memoryStore: MemoryStore,
  action: RetryAction,
): ExecutionCycleOutput {
  const status = action.kind === "ESCALATE_TO_USER" ? "ESCALATED" : "FAILED";

  return {
    result: {
      status,
      confidence: state.termination.confidenceScore,
      outputs: [],
      finalResponse: action.kind === "ABORT" ? action.reason : "",
      metrics: state.metrics,
      history: state.retryPolicy.history,
    },
    updatedMemoryStore: memoryStore,
    finalState: { ...state, currentPhase: "FAILED" },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { createMemoryStore, addMemory, createMemoryItem, createQueryContext };
