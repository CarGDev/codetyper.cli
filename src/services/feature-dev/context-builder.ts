/**
 * Context Builder
 *
 * Builds context for each phase of feature development.
 */

import {
  PHASE_PROMPTS,
  PHASE_DESCRIPTIONS,
} from "@constants/feature-dev";
import type {
  FeatureDevPhase,
  FeatureDevState,
} from "@/types/feature-dev";

/**
 * Build the full context for a phase execution
 */
export const buildPhaseContext = (
  phase: FeatureDevPhase,
  state: FeatureDevState,
  userRequest: string,
): string => {
  const parts: string[] = [];

  // Phase header
  parts.push(`# Feature Development: ${phase.toUpperCase()} Phase`);
  parts.push("");
  parts.push(`**Goal:** ${PHASE_DESCRIPTIONS[phase]}`);
  parts.push("");

  // Phase-specific prompt
  parts.push("## Instructions");
  parts.push(PHASE_PROMPTS[phase]);
  parts.push("");

  // User's original request
  parts.push("## Feature Request");
  parts.push(userRequest);
  parts.push("");

  // Add state context based on phase
  const stateContext = buildStateContext(phase, state);
  if (stateContext) {
    parts.push("## Current State");
    parts.push(stateContext);
    parts.push("");
  }

  return parts.join("\n");
};

/**
 * Build state context based on accumulated results
 */
const buildStateContext = (
  phase: FeatureDevPhase,
  state: FeatureDevState,
): string | null => {
  const contextBuilders: Record<FeatureDevPhase, () => string | null> = {
    understand: () => null, // No prior context

    explore: () => {
      if (state.requirements.length === 0) return null;

      const lines: string[] = [];
      lines.push("### Understood Requirements");
      for (const req of state.requirements) {
        lines.push(`- ${req}`);
      }

      if (state.clarifications.length > 0) {
        lines.push("");
        lines.push("### Clarifications");
        for (const c of state.clarifications) {
          lines.push(`Q: ${c.question}`);
          lines.push(`A: ${c.answer}`);
        }
      }

      return lines.join("\n");
    },

    plan: () => {
      const lines: string[] = [];

      // Requirements
      if (state.requirements.length > 0) {
        lines.push("### Requirements");
        for (const req of state.requirements) {
          lines.push(`- ${req}`);
        }
        lines.push("");
      }

      // Exploration results
      if (state.relevantFiles.length > 0) {
        lines.push("### Relevant Files Found");
        for (const file of state.relevantFiles.slice(0, 10)) {
          lines.push(`- ${file}`);
        }
        if (state.relevantFiles.length > 10) {
          lines.push(`- ... and ${state.relevantFiles.length - 10} more`);
        }
        lines.push("");
      }

      // Patterns found
      const patterns = state.explorationResults.flatMap((r) => r.patterns);
      if (patterns.length > 0) {
        lines.push("### Patterns to Follow");
        for (const pattern of [...new Set(patterns)].slice(0, 5)) {
          lines.push(`- ${pattern}`);
        }
        lines.push("");
      }

      return lines.length > 0 ? lines.join("\n") : null;
    },

    implement: () => {
      if (!state.plan) return null;

      const lines: string[] = [];
      lines.push("### Approved Implementation Plan");
      lines.push(`**Summary:** ${state.plan.summary}`);
      lines.push("");
      lines.push("**Steps:**");
      for (const step of state.plan.steps) {
        lines.push(`${step.order}. [${step.changeType}] ${step.file}`);
        lines.push(`   ${step.description}`);
      }

      if (state.plan.risks.length > 0) {
        lines.push("");
        lines.push("**Risks to Watch:**");
        for (const risk of state.plan.risks) {
          lines.push(`- ${risk}`);
        }
      }

      return lines.join("\n");
    },

    verify: () => {
      if (state.changes.length === 0) return null;

      const lines: string[] = [];
      lines.push("### Files Changed");
      for (const change of state.changes) {
        lines.push(
          `- ${change.path} (${change.changeType}, +${change.additions}/-${change.deletions})`,
        );
      }

      if (state.plan?.testStrategy) {
        lines.push("");
        lines.push("### Test Strategy");
        lines.push(state.plan.testStrategy);
      }

      return lines.join("\n");
    },

    review: () => {
      const lines: string[] = [];

      // Changes to review
      if (state.changes.length > 0) {
        lines.push("### Changes to Review");
        for (const change of state.changes) {
          lines.push(
            `- ${change.path} (${change.changeType}, +${change.additions}/-${change.deletions})`,
          );
        }
        lines.push("");
      }

      // Test results
      if (state.testResults) {
        lines.push("### Test Results");
        lines.push(
          `${state.testResults.passedTests}/${state.testResults.totalTests} tests passed`,
        );
        if (state.testResults.failedTests > 0) {
          lines.push("**Failures:**");
          for (const failure of state.testResults.failures) {
            lines.push(`- ${failure.testName}: ${failure.error}`);
          }
        }
        lines.push("");
      }

      return lines.length > 0 ? lines.join("\n") : null;
    },

    finalize: () => {
      const lines: string[] = [];

      // Summary of changes
      lines.push("### Summary of Changes");
      for (const change of state.changes) {
        lines.push(
          `- ${change.path} (${change.changeType}, +${change.additions}/-${change.deletions})`,
        );
      }
      lines.push("");

      // Review findings to address
      const issues = state.reviewFindings.filter(
        (f) => f.type === "issue" && f.severity === "critical",
      );
      if (issues.length > 0) {
        lines.push("### Outstanding Issues");
        for (const issue of issues) {
          lines.push(`- [${issue.severity}] ${issue.message}`);
        }
        lines.push("");
      }

      // Test status
      if (state.testResults) {
        const status = state.testResults.passed ? "✓ All tests passing" : "✗ Tests failing";
        lines.push(`### Test Status: ${status}`);
      }

      return lines.join("\n");
    },
  };

  return contextBuilders[phase]();
};

/**
 * Build summary of current workflow state
 */
export const buildWorkflowSummary = (state: FeatureDevState): string => {
  const lines: string[] = [];

  lines.push("# Feature Development Progress");
  lines.push("");
  lines.push(`**Current Phase:** ${state.phase}`);
  lines.push(`**Status:** ${state.phaseStatus}`);
  lines.push("");

  // Phase completion status
  const phases: FeatureDevPhase[] = [
    "understand",
    "explore",
    "plan",
    "implement",
    "verify",
    "review",
    "finalize",
  ];

  const currentIndex = phases.indexOf(state.phase);

  lines.push("## Progress");
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const status =
      i < currentIndex
        ? "✓"
        : i === currentIndex
          ? state.phaseStatus === "completed"
            ? "✓"
            : "→"
          : "○";
    lines.push(`${status} ${phase}`);
  }

  return lines.join("\n");
};

/**
 * Extract key information from state for quick reference
 */
export const extractKeyInfo = (
  state: FeatureDevState,
): Record<string, string | number> => {
  return {
    phase: state.phase,
    status: state.phaseStatus,
    requirementsCount: state.requirements.length,
    relevantFilesCount: state.relevantFiles.length,
    changesCount: state.changes.length,
    reviewFindingsCount: state.reviewFindings.length,
    checkpointsCount: state.checkpoints.length,
    duration: Date.now() - state.startedAt,
  };
};
