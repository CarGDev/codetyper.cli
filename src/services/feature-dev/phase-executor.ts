/**
 * Phase Executor
 *
 * Executes individual phases of the feature development workflow.
 */

import {
  PHASE_ORDER,
  ALLOWED_TRANSITIONS,
  PHASE_TIMEOUTS,
  FEATURE_DEV_ERRORS,
  FEATURE_DEV_MESSAGES,
} from "@constants/feature-dev";
import {
  createCheckpoint,
  requiresCheckpoint,
  requestApproval,
  processCheckpointDecision,
} from "@services/feature-dev/checkpoint-handler";
import { buildPhaseContext } from "@services/feature-dev/context-builder";
import type {
  FeatureDevPhase,
  PhaseExecutionContext,
  PhaseExecutionResult,
  PhaseTransitionRequest,
} from "@/types/feature-dev";

/**
 * Execute a single phase
 */
export const executePhase = async (
  phase: FeatureDevPhase,
  ctx: PhaseExecutionContext,
  userRequest: string,
): Promise<PhaseExecutionResult> => {
  // Update state to in_progress
  ctx.state.phase = phase;
  ctx.state.phaseStatus = "in_progress";
  ctx.state.updatedAt = Date.now();

  ctx.onProgress?.(FEATURE_DEV_MESSAGES.STARTING(phase));

  try {
    // Execute phase-specific logic
    const result = await executePhaseLogic(phase, ctx, userRequest);

    // Handle checkpoint if needed
    if (requiresCheckpoint(phase) || result.checkpoint) {
      const checkpoint =
        result.checkpoint ?? createCheckpoint(phase, ctx.state, []);

      ctx.state.phaseStatus = "awaiting_approval";

      const { decision, feedback } = await requestApproval(checkpoint, ctx);
      const { proceed, action } = processCheckpointDecision(decision, feedback);

      if (!proceed) {
        if (action === "aborted") {
          ctx.state.abortReason = feedback ?? "User aborted";
          return {
            success: false,
            phase,
            error: FEATURE_DEV_ERRORS.WORKFLOW_ABORTED(ctx.state.abortReason),
            stateUpdates: { phaseStatus: "failed" },
          };
        }

        // Rejected or modify - stay in current phase
        return {
          success: false,
          phase,
          stateUpdates: { phaseStatus: "pending" },
        };
      }

      ctx.state.phaseStatus = "approved";
    }

    // Phase completed successfully
    ctx.state.phaseStatus = "completed";
    ctx.state.updatedAt = Date.now();

    ctx.onProgress?.(FEATURE_DEV_MESSAGES.COMPLETED(phase));

    return {
      success: true,
      phase,
      nextPhase: getNextPhase(phase),
      stateUpdates: { phaseStatus: "completed", ...result.stateUpdates },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.state.phaseStatus = "failed";

    return {
      success: false,
      phase,
      error: FEATURE_DEV_ERRORS.PHASE_FAILED(phase, message),
      stateUpdates: { phaseStatus: "failed" },
    };
  }
};

/**
 * Execute phase-specific logic
 */
const executePhaseLogic = async (
  phase: FeatureDevPhase,
  ctx: PhaseExecutionContext,
  userRequest: string,
): Promise<Partial<PhaseExecutionResult>> => {
  // Build context for this phase
  const phaseContext = buildPhaseContext(phase, ctx.state, userRequest);

  // Phase-specific execution
  const phaseExecutors: Record<
    FeatureDevPhase,
    () => Promise<Partial<PhaseExecutionResult>>
  > = {
    understand: async () => executeUnderstandPhase(ctx, phaseContext),
    explore: async () => executeExplorePhase(ctx, phaseContext),
    plan: async () => executePlanPhase(ctx, phaseContext),
    implement: async () => executeImplementPhase(ctx, phaseContext),
    verify: async () => executeVerifyPhase(ctx, phaseContext),
    review: async () => executeReviewPhase(ctx, phaseContext),
    finalize: async () => executeFinalizePhase(ctx, phaseContext),
  };

  return phaseExecutors[phase]();
};

/**
 * Understand phase execution
 */
const executeUnderstandPhase = async (
  ctx: PhaseExecutionContext,
  _phaseContext: string,
): Promise<Partial<PhaseExecutionResult>> => {
  // This phase would typically involve LLM interaction to:
  // 1. Parse the user's request
  // 2. Identify requirements
  // 3. Ask clarifying questions
  // For now, return a checkpoint for user confirmation

  const checkpoint = createCheckpoint("understand", ctx.state, [
    "Review the identified requirements",
    "Provide any clarifications needed",
    "Confirm understanding is correct",
  ]);

  return {
    checkpoint,
    stateUpdates: {},
  };
};

/**
 * Explore phase execution
 */
const executeExplorePhase = async (
  ctx: PhaseExecutionContext,
  _phaseContext: string,
): Promise<Partial<PhaseExecutionResult>> => {
  ctx.onProgress?.(FEATURE_DEV_MESSAGES.EXPLORING("relevant code patterns"));

  // This phase would use parallel agents to search the codebase
  // For now, return a basic result

  return {
    stateUpdates: {},
  };
};

/**
 * Plan phase execution
 */
const executePlanPhase = async (
  ctx: PhaseExecutionContext,
  _phaseContext: string,
): Promise<Partial<PhaseExecutionResult>> => {
  // This phase would involve LLM to create implementation plan
  // The plan must be approved before proceeding

  const checkpoint = createCheckpoint("plan", ctx.state, [
    "Review the implementation plan",
    "Check the proposed file changes",
    "Verify the approach is correct",
    "Consider the identified risks",
  ]);

  return {
    checkpoint,
    stateUpdates: {},
  };
};

/**
 * Implement phase execution
 */
const executeImplementPhase = async (
  ctx: PhaseExecutionContext,
  _phaseContext: string,
): Promise<Partial<PhaseExecutionResult>> => {
  // Verify we have a plan
  if (!ctx.state.plan) {
    throw new Error(FEATURE_DEV_ERRORS.NO_PLAN);
  }

  // This phase would execute each step in the plan
  const totalSteps = ctx.state.plan.steps.length;

  for (let i = 0; i < totalSteps; i++) {
    ctx.onProgress?.(FEATURE_DEV_MESSAGES.IMPLEMENTING_STEP(i + 1, totalSteps));
    // Step execution would happen here
  }

  return {
    stateUpdates: {},
  };
};

/**
 * Verify phase execution
 */
const executeVerifyPhase = async (
  ctx: PhaseExecutionContext,
  _phaseContext: string,
): Promise<Partial<PhaseExecutionResult>> => {
  ctx.onProgress?.(FEATURE_DEV_MESSAGES.RUNNING_TESTS);

  // This phase would run the test suite
  // For now, create a checkpoint for test review

  const checkpoint = createCheckpoint("verify", ctx.state, [
    "Review test results",
    "Check for any failures",
    "Verify coverage is adequate",
  ]);

  return {
    checkpoint,
    stateUpdates: {},
  };
};

/**
 * Review phase execution
 */
const executeReviewPhase = async (
  ctx: PhaseExecutionContext,
  _phaseContext: string,
): Promise<Partial<PhaseExecutionResult>> => {
  ctx.onProgress?.(FEATURE_DEV_MESSAGES.REVIEWING);

  // This phase would perform self-review of changes
  const checkpoint = createCheckpoint("review", ctx.state, [
    "Review code quality findings",
    "Address any critical issues",
    "Confirm changes are ready",
  ]);

  return {
    checkpoint,
    stateUpdates: {},
  };
};

/**
 * Finalize phase execution
 */
const executeFinalizePhase = async (
  ctx: PhaseExecutionContext,
  _phaseContext: string,
): Promise<Partial<PhaseExecutionResult>> => {
  ctx.onProgress?.(FEATURE_DEV_MESSAGES.FINALIZING);

  // This phase would create the commit
  const checkpoint = createCheckpoint("finalize", ctx.state, [
    "Confirm commit message",
    "Verify all changes are included",
    "Approve final commit",
  ]);

  return {
    checkpoint,
    stateUpdates: {},
  };
};

/**
 * Get the next phase in the workflow
 */
export const getNextPhase = (
  currentPhase: FeatureDevPhase,
): FeatureDevPhase | undefined => {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return undefined;
  }
  return PHASE_ORDER[currentIndex + 1];
};

/**
 * Get the previous phase in the workflow
 */
export const getPreviousPhase = (
  currentPhase: FeatureDevPhase,
): FeatureDevPhase | undefined => {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex <= 0) {
    return undefined;
  }
  return PHASE_ORDER[currentIndex - 1];
};

/**
 * Validate a phase transition
 */
export const validateTransition = (
  request: PhaseTransitionRequest,
): { valid: boolean; error?: string } => {
  if (request.skipValidation) {
    return { valid: true };
  }

  const allowed = ALLOWED_TRANSITIONS[request.fromPhase];
  if (!allowed.includes(request.toPhase)) {
    return {
      valid: false,
      error: FEATURE_DEV_ERRORS.INVALID_TRANSITION(
        request.fromPhase,
        request.toPhase,
      ),
    };
  }

  return { valid: true };
};

/**
 * Get timeout for a phase
 */
export const getPhaseTimeout = (phase: FeatureDevPhase): number => {
  return PHASE_TIMEOUTS[phase];
};
