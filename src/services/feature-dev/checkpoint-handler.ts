/**
 * Checkpoint Handler
 *
 * Manages user approval checkpoints during feature development.
 */

import {
  PHASE_CHECKPOINTS,
  FEATURE_DEV_ERRORS,
} from "@constants/feature-dev";
import type {
  FeatureDevPhase,
  FeatureDevState,
  Checkpoint,
  CheckpointDecision,
  PhaseExecutionContext,
} from "@/types/feature-dev";

/**
 * Create a checkpoint for user approval
 */
export const createCheckpoint = (
  phase: FeatureDevPhase,
  state: FeatureDevState,
  details: string[],
): Checkpoint => {
  const config = PHASE_CHECKPOINTS[phase];

  return {
    phase,
    title: config.title,
    summary: buildCheckpointSummary(phase, state),
    details,
    requiresApproval: config.required,
    suggestedAction: "approve",
  };
};

/**
 * Build summary for checkpoint based on phase
 */
const buildCheckpointSummary = (
  phase: FeatureDevPhase,
  state: FeatureDevState,
): string => {
  const summaryBuilders: Record<FeatureDevPhase, () => string> = {
    understand: () => {
      const reqCount = state.requirements.length;
      const clarCount = state.clarifications.length;
      return `${reqCount} requirement(s) identified, ${clarCount} clarification(s) made`;
    },

    explore: () => {
      const fileCount = state.relevantFiles.length;
      const findingCount = state.explorationResults.reduce(
        (sum, r) => sum + r.findings.length,
        0,
      );
      return `Found ${fileCount} relevant file(s) with ${findingCount} finding(s)`;
    },

    plan: () => {
      if (!state.plan) return "No plan created";
      const stepCount = state.plan.steps.length;
      const complexity = state.plan.estimatedComplexity;
      return `${stepCount} step(s) planned, ${complexity} complexity`;
    },

    implement: () => {
      const changeCount = state.changes.length;
      const additions = state.changes.reduce((sum, c) => sum + c.additions, 0);
      const deletions = state.changes.reduce((sum, c) => sum + c.deletions, 0);
      return `${changeCount} file(s) changed (+${additions}/-${deletions})`;
    },

    verify: () => {
      if (!state.testResults) return "Tests not run yet";
      const { passedTests, failedTests, totalTests } = state.testResults;
      return `${passedTests}/${totalTests} tests passed, ${failedTests} failed`;
    },

    review: () => {
      const issues = state.reviewFindings.filter((f) => f.type === "issue").length;
      const suggestions = state.reviewFindings.filter(
        (f) => f.type === "suggestion",
      ).length;
      return `${issues} issue(s), ${suggestions} suggestion(s) found`;
    },

    finalize: () => {
      const changeCount = state.changes.length;
      return `Ready to commit ${changeCount} file change(s)`;
    },
  };

  return summaryBuilders[phase]();
};

/**
 * Check if phase requires a checkpoint
 */
export const requiresCheckpoint = (phase: FeatureDevPhase): boolean => {
  return PHASE_CHECKPOINTS[phase].required;
};

/**
 * Request user approval at a checkpoint
 */
export const requestApproval = async (
  checkpoint: Checkpoint,
  ctx: PhaseExecutionContext,
): Promise<{ decision: CheckpointDecision; feedback?: string }> => {
  // If no checkpoint handler provided, auto-approve non-required checkpoints
  if (!ctx.onCheckpoint) {
    if (checkpoint.requiresApproval) {
      throw new Error(FEATURE_DEV_ERRORS.CHECKPOINT_REQUIRED(checkpoint.phase));
    }
    return { decision: "approve" };
  }

  // Request approval from handler
  const result = await ctx.onCheckpoint(checkpoint);

  // Record checkpoint in state
  ctx.state.checkpoints.push({
    checkpoint,
    decision: result.decision,
    feedback: result.feedback,
    timestamp: Date.now(),
  });

  return result;
};

/**
 * Process checkpoint decision
 */
export const processCheckpointDecision = (
  decision: CheckpointDecision,
  _feedback?: string,
): { proceed: boolean; action?: string } => {
  const decisionHandlers: Record<
    CheckpointDecision,
    () => { proceed: boolean; action?: string }
  > = {
    approve: () => ({ proceed: true }),
    reject: () => ({ proceed: false, action: "rejected" }),
    modify: () => ({ proceed: false, action: "modify", }),
    skip: () => ({ proceed: true, action: "skipped" }),
    abort: () => ({ proceed: false, action: "aborted" }),
  };

  return decisionHandlers[decision]();
};

/**
 * Format checkpoint for display
 */
export const formatCheckpoint = (checkpoint: Checkpoint): string => {
  const lines: string[] = [];

  lines.push(`## ${checkpoint.title}`);
  lines.push("");
  lines.push(`**Phase:** ${checkpoint.phase}`);
  lines.push(`**Summary:** ${checkpoint.summary}`);
  lines.push("");

  if (checkpoint.details.length > 0) {
    lines.push("### Details");
    for (const detail of checkpoint.details) {
      lines.push(`- ${detail}`);
    }
    lines.push("");
  }

  if (checkpoint.requiresApproval) {
    lines.push("*This checkpoint requires your approval to proceed.*");
  }

  return lines.join("\n");
};

/**
 * Get checkpoint history for a phase
 */
export const getPhaseCheckpoints = (
  state: FeatureDevState,
  phase: FeatureDevPhase,
): Array<{
  checkpoint: Checkpoint;
  decision: CheckpointDecision;
  feedback?: string;
  timestamp: number;
}> => {
  return state.checkpoints.filter((c) => c.checkpoint.phase === phase);
};

/**
 * Check if phase was approved
 */
export const wasPhaseApproved = (
  state: FeatureDevState,
  phase: FeatureDevPhase,
): boolean => {
  const checkpoints = getPhaseCheckpoints(state, phase);
  return checkpoints.some(
    (c) => c.decision === "approve" || c.decision === "skip",
  );
};
