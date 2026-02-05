/**
 * Feature-Dev Workflow Service
 *
 * Main orchestrator for the 7-phase feature development workflow.
 */

import {
  PHASE_ORDER,
  FEATURE_DEV_CONFIG,
  FEATURE_DEV_ERRORS,
} from "@constants/feature-dev";
import {
  executePhase,
  validateTransition,
} from "@services/feature-dev/phase-executor";
import {
  buildWorkflowSummary,
  extractKeyInfo,
} from "@services/feature-dev/context-builder";
import type {
  FeatureDevPhase,
  FeatureDevState,
  PhaseExecutionContext,
  Checkpoint,
  CheckpointDecision,
} from "@/types/feature-dev";

// Active workflows storage
const activeWorkflows = new Map<string, FeatureDevState>();

/**
 * Create a new feature development workflow
 */
export const createWorkflow = (
  id: string,
  requirements: string[] = [],
): FeatureDevState => {
  const state: FeatureDevState = {
    id,
    phase: "understand",
    phaseStatus: "pending",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    requirements,
    clarifications: [],
    explorationResults: [],
    relevantFiles: [],
    changes: [],
    reviewFindings: [],
    checkpoints: [],
  };

  activeWorkflows.set(id, state);
  return state;
};

/**
 * Get an active workflow by ID
 */
export const getWorkflow = (id: string): FeatureDevState | undefined => {
  return activeWorkflows.get(id);
};

/**
 * Update workflow state
 */
export const updateWorkflow = (
  id: string,
  updates: Partial<FeatureDevState>,
): FeatureDevState | undefined => {
  const workflow = activeWorkflows.get(id);
  if (!workflow) return undefined;

  const updated = {
    ...workflow,
    ...updates,
    updatedAt: Date.now(),
  };

  activeWorkflows.set(id, updated);
  return updated;
};

/**
 * Delete a workflow
 */
export const deleteWorkflow = (id: string): boolean => {
  return activeWorkflows.delete(id);
};

/**
 * Run the complete feature development workflow
 */
export const runWorkflow = async (
  workflowId: string,
  userRequest: string,
  options: {
    config?: Partial<typeof FEATURE_DEV_CONFIG>;
    workingDir: string;
    sessionId: string;
    abortSignal?: AbortSignal;
    onProgress?: (message: string) => void;
    onCheckpoint?: (checkpoint: Checkpoint) => Promise<{
      decision: CheckpointDecision;
      feedback?: string;
    }>;
  },
): Promise<{
  success: boolean;
  finalState: FeatureDevState;
  error?: string;
}> => {
  // Merge config with defaults (kept for future extensibility)
  void { ...FEATURE_DEV_CONFIG, ...options.config };

  // Get or create workflow
  let state = getWorkflow(workflowId);
  if (!state) {
    state = createWorkflow(workflowId);
  }

  // Build execution context
  const ctx: PhaseExecutionContext = {
    state,
    workingDir: options.workingDir,
    sessionId: options.sessionId,
    abortSignal: options.abortSignal,
    onProgress: options.onProgress,
    onCheckpoint: options.onCheckpoint,
  };

  // Execute phases in order
  while (state.phase !== "finalize" || state.phaseStatus !== "completed") {
    // Check for abort
    if (options.abortSignal?.aborted) {
      state.abortReason = "Workflow aborted by user";
      state.phaseStatus = "failed";
      return {
        success: false,
        finalState: state,
        error: FEATURE_DEV_ERRORS.WORKFLOW_ABORTED(state.abortReason),
      };
    }

    // Execute current phase
    const result = await executePhase(state.phase, ctx, userRequest);

    // Apply state updates
    if (result.stateUpdates) {
      state = updateWorkflow(workflowId, result.stateUpdates) ?? state;
      ctx.state = state;
    }

    // Handle phase result
    if (!result.success) {
      if (state.abortReason) {
        // Workflow was aborted
        return {
          success: false,
          finalState: state,
          error: result.error,
        };
      }
      // Phase needs attention (rejected, needs modification, etc.)
      // Stay in current phase and let caller handle
      continue;
    }

    // Move to next phase
    if (result.nextPhase) {
      const transition = validateTransition({
        fromPhase: state.phase,
        toPhase: result.nextPhase,
      });

      if (!transition.valid) {
        return {
          success: false,
          finalState: state,
          error: transition.error,
        };
      }

      state =
        updateWorkflow(workflowId, {
          phase: result.nextPhase,
          phaseStatus: "pending",
        }) ?? state;
      ctx.state = state;
    } else {
      // No next phase, workflow complete
      break;
    }
  }

  return {
    success: true,
    finalState: state,
  };
};

/**
 * Get workflow progress summary
 */
export const getWorkflowProgress = (
  workflowId: string,
):
  | { summary: string; keyInfo: Record<string, string | number> }
  | undefined => {
  const workflow = getWorkflow(workflowId);
  if (!workflow) return undefined;

  return {
    summary: buildWorkflowSummary(workflow),
    keyInfo: extractKeyInfo(workflow),
  };
};

/**
 * Abort an active workflow
 */
export const abortWorkflow = (
  workflowId: string,
  reason: string,
): FeatureDevState | undefined => {
  return updateWorkflow(workflowId, {
    phaseStatus: "failed",
    abortReason: reason,
  });
};

/**
 * Reset workflow to a specific phase
 */
export const resetToPhase = (
  workflowId: string,
  phase: FeatureDevPhase,
): FeatureDevState | undefined => {
  const workflow = getWorkflow(workflowId);
  if (!workflow) return undefined;

  // Clear state accumulated after this phase
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const updates: Partial<FeatureDevState> = {
    phase,
    phaseStatus: "pending",
  };

  // Clear phase-specific data based on which phase we're resetting to
  if (phaseIndex <= PHASE_ORDER.indexOf("explore")) {
    updates.explorationResults = [];
    updates.relevantFiles = [];
  }
  if (phaseIndex <= PHASE_ORDER.indexOf("plan")) {
    updates.plan = undefined;
  }
  if (phaseIndex <= PHASE_ORDER.indexOf("implement")) {
    updates.changes = [];
  }
  if (phaseIndex <= PHASE_ORDER.indexOf("verify")) {
    updates.testResults = undefined;
  }
  if (phaseIndex <= PHASE_ORDER.indexOf("review")) {
    updates.reviewFindings = [];
  }
  if (phaseIndex <= PHASE_ORDER.indexOf("finalize")) {
    updates.commitHash = undefined;
  }

  return updateWorkflow(workflowId, updates);
};

/**
 * List all active workflows
 */
export const listWorkflows = (): Array<{
  id: string;
  phase: FeatureDevPhase;
  status: string;
  startedAt: number;
}> => {
  return Array.from(activeWorkflows.values()).map((w) => ({
    id: w.id,
    phase: w.phase,
    status: w.phaseStatus,
    startedAt: w.startedAt,
  }));
};

/**
 * Create workflow ID
 */
export const createWorkflowId = (): string => {
  return `fd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
