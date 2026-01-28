/**
 * Termination Confidence Detection Layer
 * Determines task completion through observable validation signals
 */

import type {
  TerminationStatus,
  TerminationState,
  TerminationTrigger,
  TerminationOutput,
  TerminationDecision,
  TerminationEvidence,
  CompletionSignal,
  ValidationCheck,
  ValidationCheckType,
  ValidationResult,
  ValidationFailure,
} from "@/types/reasoning";

import {
  CONFIDENCE_THRESHOLDS,
  COMPLETION_SIGNAL_PATTERNS,
  TOOL_SUCCESS_CONFIDENCE,
  NO_PENDING_ACTIONS_CONFIDENCE,
  VALIDATION_CHECK_CONFIGS,
} from "@constants/reasoning";

import { createTimestamp } from "@services/reasoning/utils";

// =============================================================================
// STATE INITIALIZATION
// =============================================================================

export function createInitialTerminationState(): TerminationState {
  return {
    status: "RUNNING",
    validationResults: [],
    completionSignals: [],
    confidenceScore: 0,
    pendingChecks: [],
  };
}

// =============================================================================
// STATE MACHINE TRANSITIONS
// =============================================================================

export function processTerminationTrigger(
  state: TerminationState,
  trigger: TerminationTrigger,
): TerminationOutput {
  const updatedSignals = collectSignals(state.completionSignals, trigger);
  const updatedResults = updateValidationResults(
    state.validationResults,
    trigger,
  );

  const confidence = computeTerminationConfidence(
    updatedSignals,
    updatedResults,
  );
  const nextStatus = computeNextStatus(state.status, confidence, trigger);

  const decision = computeDecision(nextStatus, confidence, updatedResults);

  const evidence: TerminationEvidence = {
    signals: updatedSignals,
    validationResults: updatedResults,
    pendingItems: computePendingItems(nextStatus, state.pendingChecks),
  };

  return {
    status: nextStatus,
    confidence,
    decision,
    evidence,
  };
}

// =============================================================================
// SIGNAL COLLECTION
// =============================================================================

function collectSignals(
  existing: CompletionSignal[],
  trigger: TerminationTrigger,
): CompletionSignal[] {
  const newSignals = extractSignalsFromTrigger(trigger);
  return [...existing, ...newSignals];
}

function extractSignalsFromTrigger(
  trigger: TerminationTrigger,
): CompletionSignal[] {
  const signals: CompletionSignal[] = [];
  const timestamp = createTimestamp();

  if (trigger.event === "MODEL_OUTPUT") {
    const modelSignals = detectModelCompletionSignals(trigger.content);
    signals.push(...modelSignals);

    if (!trigger.hasToolCalls) {
      signals.push({
        source: "NO_PENDING_ACTIONS",
        timestamp,
        confidence: NO_PENDING_ACTIONS_CONFIDENCE,
        evidence: "No tool calls in response",
      });
    }
  }

  if (trigger.event === "TOOL_COMPLETED" && trigger.success) {
    signals.push({
      source: "TOOL_SUCCESS",
      timestamp,
      confidence: TOOL_SUCCESS_CONFIDENCE,
      evidence: `Tool ${trigger.toolName} completed successfully`,
    });
  }

  if (trigger.event === "USER_INPUT" && trigger.isAcceptance) {
    signals.push({
      source: "USER_ACCEPT",
      timestamp,
      confidence: 1.0,
      evidence: "User accepted the result",
    });
  }

  return signals;
}

function detectModelCompletionSignals(content: string): CompletionSignal[] {
  const signals: CompletionSignal[] = [];
  const timestamp = createTimestamp();

  for (const signalConfig of COMPLETION_SIGNAL_PATTERNS) {
    for (const pattern of signalConfig.patterns) {
      if (pattern.test(content)) {
        signals.push({
          source: signalConfig.type,
          timestamp,
          confidence: signalConfig.confidence,
          evidence: `Matched pattern: ${pattern.source}`,
        });
        break;
      }
    }
  }

  return signals;
}

// =============================================================================
// VALIDATION RESULT HANDLING
// =============================================================================

function updateValidationResults(
  existing: ValidationResult[],
  trigger: TerminationTrigger,
): ValidationResult[] {
  if (trigger.event === "VALIDATION_RESULT") {
    const existingIdx = existing.findIndex(
      (r) => r.checkId === trigger.result.checkId,
    );

    if (existingIdx >= 0) {
      const updated = [...existing];
      updated[existingIdx] = trigger.result;
      return updated;
    }

    return [...existing, trigger.result];
  }

  return existing;
}

// =============================================================================
// CONFIDENCE COMPUTATION
// =============================================================================

export function computeTerminationConfidence(
  signals: CompletionSignal[],
  validationResults: ValidationResult[],
): number {
  const signalScore = computeSignalScore(signals);
  const validationScore = computeValidationScore(validationResults);

  return signalScore + validationScore;
}

function computeSignalScore(signals: CompletionSignal[]): number {
  const maxSignalScore = 0.4;
  let score = 0;

  const signalContribution = 0.15;

  for (const signal of signals) {
    score += signal.confidence * signalContribution;
  }

  return Math.min(maxSignalScore, score);
}

function computeValidationScore(results: ValidationResult[]): number {
  if (results.length === 0) {
    return 0;
  }

  const requiredResults = results.filter((r) => {
    const config = Object.entries(VALIDATION_CHECK_CONFIGS).find(([type]) =>
      r.checkId.includes(type.toLowerCase()),
    );
    return config?.[1].required ?? true;
  });

  const optionalResults = results.filter((r) => !requiredResults.includes(r));

  const requiredPassRate =
    requiredResults.length > 0
      ? requiredResults.filter((r) => r.passed).length / requiredResults.length
      : 1;

  const optionalPassRate =
    optionalResults.length > 0
      ? optionalResults.filter((r) => r.passed).length / optionalResults.length
      : 1;

  return requiredPassRate * 0.5 + optionalPassRate * 0.1;
}

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

function computeNextStatus(
  currentStatus: TerminationStatus,
  confidence: number,
  trigger: TerminationTrigger,
): TerminationStatus {
  if (trigger.event === "USER_INPUT" && trigger.isAcceptance) {
    return "CONFIRMED_COMPLETE";
  }

  const statusTransitions: Record<
    TerminationStatus,
    (confidence: number) => TerminationStatus
  > = {
    RUNNING: (conf) => {
      if (conf >= CONFIDENCE_THRESHOLDS.POTENTIALLY_COMPLETE) {
        return "POTENTIALLY_COMPLETE";
      }
      return "RUNNING";
    },
    POTENTIALLY_COMPLETE: () => "AWAITING_VALIDATION",
    AWAITING_VALIDATION: (conf) => {
      if (conf >= CONFIDENCE_THRESHOLDS.CONFIRMED_COMPLETE) {
        return "CONFIRMED_COMPLETE";
      }
      if (conf < CONFIDENCE_THRESHOLDS.POTENTIALLY_COMPLETE) {
        return "RUNNING";
      }
      return "AWAITING_VALIDATION";
    },
    CONFIRMED_COMPLETE: () => "CONFIRMED_COMPLETE",
    FAILED: () => "FAILED",
  };

  const transition = statusTransitions[currentStatus];
  return transition(confidence);
}

// =============================================================================
// DECISION COMPUTATION
// =============================================================================

function computeDecision(
  status: TerminationStatus,
  confidence: number,
  validationResults: ValidationResult[],
): TerminationDecision {
  const decisionMap: Record<TerminationStatus, () => TerminationDecision> = {
    RUNNING: () => ({
      kind: "CONTINUE",
      reason: `Confidence ${(confidence * 100).toFixed(1)}% below threshold`,
    }),
    POTENTIALLY_COMPLETE: () => ({
      kind: "VALIDATE",
      checks: selectValidationChecks(validationResults),
    }),
    AWAITING_VALIDATION: () => {
      const failedChecks = validationResults.filter((r) => !r.passed);

      if (failedChecks.length > 0) {
        const recoverable = failedChecks.every((c) => isRecoverableFailure(c));
        return {
          kind: "FAIL",
          reason: `Validation failed: ${failedChecks.map((c) => c.details).join("; ")}`,
          recoverable,
        };
      }

      return {
        kind: "VALIDATE",
        checks: selectValidationChecks(validationResults),
      };
    },
    CONFIRMED_COMPLETE: () => ({
      kind: "COMPLETE",
      summary: `Task completed with ${(confidence * 100).toFixed(1)}% confidence`,
    }),
    FAILED: () => ({
      kind: "FAIL",
      reason: "Task failed after exhausting retries",
      recoverable: false,
    }),
  };

  const decisionFn = decisionMap[status];
  return decisionFn();
}

function selectValidationChecks(
  existingResults: ValidationResult[],
): ValidationCheck[] {
  const completedCheckIds = new Set(existingResults.map((r) => r.checkId));

  const allChecks: ValidationCheck[] = Object.entries(
    VALIDATION_CHECK_CONFIGS,
  ).map(([type, config]) => ({
    id: `${type.toLowerCase()}_check`,
    type: type as ValidationCheckType,
    required: config.required,
    timeout: config.timeout,
  }));

  return allChecks.filter((check) => !completedCheckIds.has(check.id));
}

function isRecoverableFailure(result: ValidationResult): boolean {
  const nonRecoverablePatterns = [
    /permission denied/i,
    /access denied/i,
    /not found/i,
    /does not exist/i,
  ];

  return !nonRecoverablePatterns.some((p) => p.test(result.details));
}

// =============================================================================
// PENDING ITEMS COMPUTATION
// =============================================================================

function computePendingItems(
  status: TerminationStatus,
  pendingChecks: ValidationCheck[],
): string[] {
  if (status === "CONFIRMED_COMPLETE" || status === "FAILED") {
    return [];
  }

  return pendingChecks.map((c) => `Validation: ${c.type}`);
}

// =============================================================================
// VALIDATION CHECK EXECUTION
// =============================================================================

export interface ValidationContext {
  expectedOutputs: string[];
  modifiedFiles: string[];
  taskType: string;
  hasTests: boolean;
  testCommand?: string;
}

export async function runValidationCheck(
  check: ValidationCheck,
  context: ValidationContext,
  fileExists: (path: string) => Promise<boolean>,
  validateSyntax: (path: string) => Promise<{ valid: boolean; error?: string }>,
  runCommand: (
    cmd: string,
    timeout: number,
  ) => Promise<{ exitCode: number; output: string }>,
): Promise<ValidationResult> {
  const startTime = createTimestamp();

  const checkExecutors: Record<
    ValidationCheckType,
    () => Promise<{ passed: boolean; details: string }>
  > = {
    FILE_EXISTS: async () => {
      const results = await Promise.all(
        context.expectedOutputs.map((f) => fileExists(f)),
      );
      const allExist = results.every((r) => r);
      return {
        passed: allExist,
        details: `${results.filter((r) => r).length}/${results.length} files exist`,
      };
    },
    SYNTAX_VALID: async () => {
      const results = await Promise.all(
        context.modifiedFiles.map((f) => validateSyntax(f)),
      );
      const allValid = results.every((r) => r.valid);
      const errors = results.filter((r) => !r.valid).map((r) => r.error);
      return {
        passed: allValid,
        details: allValid ? "All files have valid syntax" : errors.join("; "),
      };
    },
    DIFF_NONEMPTY: async () => {
      if (context.taskType !== "EDIT") {
        return { passed: true, details: "N/A for non-edit tasks" };
      }
      return {
        passed: context.modifiedFiles.length > 0,
        details: `${context.modifiedFiles.length} files modified`,
      };
    },
    TESTS_PASS: async () => {
      if (!context.hasTests || !context.testCommand) {
        return { passed: true, details: "No tests configured" };
      }
      const result = await runCommand(context.testCommand, check.timeout);
      return {
        passed: result.exitCode === 0,
        details:
          result.exitCode === 0
            ? "Tests passed"
            : `Tests failed: ${result.output.slice(0, 200)}`,
      };
    },
    SCHEMA_VALID: async () => {
      return { passed: true, details: "Schema validation not implemented" };
    },
    NO_REGRESSIONS: async () => {
      return { passed: true, details: "Regression check not implemented" };
    },
  };

  const executor = checkExecutors[check.type];
  const result = await executor();

  return {
    checkId: check.id,
    passed: result.passed,
    details: result.details,
    duration: createTimestamp() - startTime,
  };
}

// =============================================================================
// VALIDATION FAILURE EXTRACTION
// =============================================================================

export function extractValidationFailures(
  results: ValidationResult[],
): ValidationFailure[] {
  return results
    .filter((r) => !r.passed)
    .map((r) => ({
      checkId: r.checkId,
      reason: r.details,
      recoverable: isRecoverableFailure(r),
    }));
}

// =============================================================================
// COMPLETION DETECTION HELPERS
// =============================================================================

export function isComplete(state: TerminationState): boolean {
  return state.status === "CONFIRMED_COMPLETE";
}

export function isFailed(state: TerminationState): boolean {
  return state.status === "FAILED";
}

export function isTerminal(state: TerminationState): boolean {
  return isComplete(state) || isFailed(state);
}

export function requiresValidation(state: TerminationState): boolean {
  return (
    state.status === "POTENTIALLY_COMPLETE" ||
    state.status === "AWAITING_VALIDATION"
  );
}

export function getConfidencePercentage(state: TerminationState): string {
  return `${(state.confidenceScore * 100).toFixed(1)}%`;
}
