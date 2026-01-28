/**
 * Unit tests for Termination Detection Layer
 */

import { describe, it, expect } from "bun:test";

import {
  createInitialTerminationState,
  processTerminationTrigger,
  computeTerminationConfidence,
  extractValidationFailures,
  isComplete,
  isFailed,
  isTerminal,
  requiresValidation,
  getConfidencePercentage,
} from "../termination-detection";

import type {
  TerminationState,
  TerminationTrigger,
  CompletionSignal,
  ValidationResult,
} from "@src/types/reasoning";

describe("Termination Detection Layer", () => {
  describe("createInitialTerminationState", () => {
    it("should create state with RUNNING status", () => {
      const state = createInitialTerminationState();

      expect(state.status).toBe("RUNNING");
      expect(state.completionSignals).toHaveLength(0);
      expect(state.validationResults).toHaveLength(0);
      expect(state.confidenceScore).toBe(0);
    });
  });

  describe("processTerminationTrigger", () => {
    describe("MODEL_OUTPUT trigger", () => {
      it("should detect completion signals from model text", () => {
        const state = createInitialTerminationState();
        const trigger: TerminationTrigger = {
          event: "MODEL_OUTPUT",
          content: "I've completed the task successfully.",
          hasToolCalls: false,
        };

        const result = processTerminationTrigger(state, trigger);

        expect(result.evidence.signals.length).toBeGreaterThan(0);
        expect(
          result.evidence.signals.some((s) => s.source === "MODEL_STATEMENT"),
        ).toBe(true);
      });

      it("should detect no pending actions when no tool calls", () => {
        const state = createInitialTerminationState();
        const trigger: TerminationTrigger = {
          event: "MODEL_OUTPUT",
          content: "Here is the answer.",
          hasToolCalls: false,
        };

        const result = processTerminationTrigger(state, trigger);

        expect(
          result.evidence.signals.some(
            (s) => s.source === "NO_PENDING_ACTIONS",
          ),
        ).toBe(true);
      });

      it("should not add NO_PENDING_ACTIONS when tool calls present", () => {
        const state = createInitialTerminationState();
        const trigger: TerminationTrigger = {
          event: "MODEL_OUTPUT",
          content: "Let me read that file.",
          hasToolCalls: true,
        };

        const result = processTerminationTrigger(state, trigger);

        expect(
          result.evidence.signals.some(
            (s) => s.source === "NO_PENDING_ACTIONS",
          ),
        ).toBe(false);
      });
    });

    describe("TOOL_COMPLETED trigger", () => {
      it("should add TOOL_SUCCESS signal on successful tool execution", () => {
        const state = createInitialTerminationState();
        const trigger: TerminationTrigger = {
          event: "TOOL_COMPLETED",
          toolName: "write",
          success: true,
        };

        const result = processTerminationTrigger(state, trigger);

        expect(
          result.evidence.signals.some((s) => s.source === "TOOL_SUCCESS"),
        ).toBe(true);
      });

      it("should not add signal on failed tool execution", () => {
        const state = createInitialTerminationState();
        const trigger: TerminationTrigger = {
          event: "TOOL_COMPLETED",
          toolName: "write",
          success: false,
        };

        const result = processTerminationTrigger(state, trigger);

        expect(
          result.evidence.signals.some((s) => s.source === "TOOL_SUCCESS"),
        ).toBe(false);
      });
    });

    describe("USER_INPUT trigger", () => {
      it("should immediately confirm completion on user acceptance", () => {
        const state = createInitialTerminationState();
        const trigger: TerminationTrigger = {
          event: "USER_INPUT",
          isAcceptance: true,
        };

        const result = processTerminationTrigger(state, trigger);

        expect(result.status).toBe("CONFIRMED_COMPLETE");
        expect(
          result.evidence.signals.some((s) => s.source === "USER_ACCEPT"),
        ).toBe(true);
      });
    });

    describe("VALIDATION_RESULT trigger", () => {
      it("should update validation results", () => {
        const state = createInitialTerminationState();
        state.status = "AWAITING_VALIDATION";

        const trigger: TerminationTrigger = {
          event: "VALIDATION_RESULT",
          result: {
            checkId: "file_exists_check",
            passed: true,
            details: "All files exist",
            duration: 100,
          },
        };

        const result = processTerminationTrigger(state, trigger);

        expect(result.evidence.validationResults).toHaveLength(1);
        expect(result.evidence.validationResults[0].passed).toBe(true);
      });

      it("should update existing validation result", () => {
        const state = createInitialTerminationState();
        state.status = "AWAITING_VALIDATION";
        state.validationResults = [
          {
            checkId: "file_exists_check",
            passed: false,
            details: "File missing",
            duration: 50,
          },
        ];

        const trigger: TerminationTrigger = {
          event: "VALIDATION_RESULT",
          result: {
            checkId: "file_exists_check",
            passed: true,
            details: "File now exists",
            duration: 100,
          },
        };

        const result = processTerminationTrigger(state, trigger);

        expect(result.evidence.validationResults).toHaveLength(1);
        expect(result.evidence.validationResults[0].passed).toBe(true);
      });
    });

    describe("status transitions", () => {
      it("should accumulate signals and increase confidence over time", () => {
        const state = createInitialTerminationState();
        state.completionSignals = [
          { source: "MODEL_STATEMENT", timestamp: Date.now(), confidence: 0.3 },
          { source: "TOOL_SUCCESS", timestamp: Date.now(), confidence: 0.5 },
          { source: "TOOL_SUCCESS", timestamp: Date.now(), confidence: 0.5 },
        ];

        const trigger: TerminationTrigger = {
          event: "MODEL_OUTPUT",
          content: "I've completed the task successfully.",
          hasToolCalls: false,
        };

        const result = processTerminationTrigger(state, trigger);

        // Confidence should increase with more signals
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.evidence.signals.length).toBeGreaterThan(
          state.completionSignals.length,
        );
      });

      it("should transition from POTENTIALLY_COMPLETE to AWAITING_VALIDATION", () => {
        const state = createInitialTerminationState();
        state.status = "POTENTIALLY_COMPLETE";

        const trigger: TerminationTrigger = {
          event: "TOOL_COMPLETED",
          toolName: "write",
          success: true,
        };

        const result = processTerminationTrigger(state, trigger);

        expect(result.status).toBe("AWAITING_VALIDATION");
      });
    });
  });

  describe("computeTerminationConfidence", () => {
    it("should compute low confidence with no signals or results", () => {
      const confidence = computeTerminationConfidence([], []);

      expect(confidence).toBe(0);
    });

    it("should compute confidence from signals", () => {
      const signals: CompletionSignal[] = [
        { source: "MODEL_STATEMENT", timestamp: Date.now(), confidence: 0.3 },
        { source: "TOOL_SUCCESS", timestamp: Date.now(), confidence: 0.5 },
      ];

      const confidence = computeTerminationConfidence(signals, []);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(0.4); // Signal max is 0.4
    });

    it("should compute confidence from validation results", () => {
      const results: ValidationResult[] = [
        {
          checkId: "file_exists_check",
          passed: true,
          details: "OK",
          duration: 100,
        },
        {
          checkId: "syntax_valid_check",
          passed: true,
          details: "OK",
          duration: 100,
        },
      ];

      const confidence = computeTerminationConfidence([], results);

      expect(confidence).toBeGreaterThan(0);
    });

    it("should compute combined confidence", () => {
      const signals: CompletionSignal[] = [
        { source: "TOOL_SUCCESS", timestamp: Date.now(), confidence: 0.5 },
      ];
      const results: ValidationResult[] = [
        {
          checkId: "file_exists_check",
          passed: true,
          details: "OK",
          duration: 100,
        },
      ];

      const combinedConfidence = computeTerminationConfidence(signals, results);
      const signalOnlyConfidence = computeTerminationConfidence(signals, []);
      const resultOnlyConfidence = computeTerminationConfidence([], results);

      expect(combinedConfidence).toBeGreaterThan(signalOnlyConfidence);
      expect(combinedConfidence).toBeGreaterThan(resultOnlyConfidence);
    });
  });

  describe("extractValidationFailures", () => {
    it("should extract failed validations", () => {
      const results: ValidationResult[] = [
        { checkId: "check_1", passed: true, details: "OK", duration: 100 },
        {
          checkId: "check_2",
          passed: false,
          details: "File not found",
          duration: 50,
        },
        {
          checkId: "check_3",
          passed: false,
          details: "Syntax error",
          duration: 75,
        },
      ];

      const failures = extractValidationFailures(results);

      expect(failures).toHaveLength(2);
      expect(failures.map((f) => f.checkId)).toContain("check_2");
      expect(failures.map((f) => f.checkId)).toContain("check_3");
    });

    it("should mark permission errors as non-recoverable", () => {
      const results: ValidationResult[] = [
        {
          checkId: "check_1",
          passed: false,
          details: "Permission denied",
          duration: 100,
        },
      ];

      const failures = extractValidationFailures(results);

      expect(failures[0].recoverable).toBe(false);
    });

    it("should mark other errors as recoverable", () => {
      const results: ValidationResult[] = [
        {
          checkId: "check_1",
          passed: false,
          details: "Timeout occurred",
          duration: 100,
        },
      ];

      const failures = extractValidationFailures(results);

      expect(failures[0].recoverable).toBe(true);
    });
  });

  describe("state query functions", () => {
    describe("isComplete", () => {
      it("should return true only for CONFIRMED_COMPLETE", () => {
        const completeState: TerminationState = {
          ...createInitialTerminationState(),
          status: "CONFIRMED_COMPLETE",
        };
        const runningState: TerminationState = {
          ...createInitialTerminationState(),
          status: "RUNNING",
        };

        expect(isComplete(completeState)).toBe(true);
        expect(isComplete(runningState)).toBe(false);
      });
    });

    describe("isFailed", () => {
      it("should return true only for FAILED", () => {
        const failedState: TerminationState = {
          ...createInitialTerminationState(),
          status: "FAILED",
        };
        const runningState: TerminationState = {
          ...createInitialTerminationState(),
          status: "RUNNING",
        };

        expect(isFailed(failedState)).toBe(true);
        expect(isFailed(runningState)).toBe(false);
      });
    });

    describe("isTerminal", () => {
      it("should return true for CONFIRMED_COMPLETE or FAILED", () => {
        expect(
          isTerminal({
            ...createInitialTerminationState(),
            status: "CONFIRMED_COMPLETE",
          }),
        ).toBe(true);
        expect(
          isTerminal({ ...createInitialTerminationState(), status: "FAILED" }),
        ).toBe(true);
        expect(
          isTerminal({ ...createInitialTerminationState(), status: "RUNNING" }),
        ).toBe(false);
        expect(
          isTerminal({
            ...createInitialTerminationState(),
            status: "AWAITING_VALIDATION",
          }),
        ).toBe(false);
      });
    });

    describe("requiresValidation", () => {
      it("should return true for POTENTIALLY_COMPLETE and AWAITING_VALIDATION", () => {
        expect(
          requiresValidation({
            ...createInitialTerminationState(),
            status: "POTENTIALLY_COMPLETE",
          }),
        ).toBe(true);
        expect(
          requiresValidation({
            ...createInitialTerminationState(),
            status: "AWAITING_VALIDATION",
          }),
        ).toBe(true);
        expect(
          requiresValidation({
            ...createInitialTerminationState(),
            status: "RUNNING",
          }),
        ).toBe(false);
        expect(
          requiresValidation({
            ...createInitialTerminationState(),
            status: "CONFIRMED_COMPLETE",
          }),
        ).toBe(false);
      });
    });

    describe("getConfidencePercentage", () => {
      it("should format confidence as percentage", () => {
        const state: TerminationState = {
          ...createInitialTerminationState(),
          confidenceScore: 0.756,
        };

        expect(getConfidencePercentage(state)).toBe("75.6%");
      });

      it("should handle zero confidence", () => {
        const state = createInitialTerminationState();

        expect(getConfidencePercentage(state)).toBe("0.0%");
      });

      it("should handle 100% confidence", () => {
        const state: TerminationState = {
          ...createInitialTerminationState(),
          confidenceScore: 1.0,
        };

        expect(getConfidencePercentage(state)).toBe("100.0%");
      });
    });
  });

  describe("decision computation", () => {
    it("should return CONTINUE for low confidence", () => {
      const state = createInitialTerminationState();
      const trigger: TerminationTrigger = {
        event: "MODEL_OUTPUT",
        content: "Working on it...",
        hasToolCalls: true,
      };

      const result = processTerminationTrigger(state, trigger);

      expect(result.decision.kind).toBe("CONTINUE");
    });

    it("should return VALIDATE for potentially complete state", () => {
      const state: TerminationState = {
        ...createInitialTerminationState(),
        status: "POTENTIALLY_COMPLETE",
        confidenceScore: 0.6,
      };
      const trigger: TerminationTrigger = {
        event: "TOOL_COMPLETED",
        toolName: "write",
        success: true,
      };

      const result = processTerminationTrigger(state, trigger);

      expect(result.decision.kind).toBe("VALIDATE");
    });

    it("should return COMPLETE for confirmed completion", () => {
      const state = createInitialTerminationState();
      const trigger: TerminationTrigger = {
        event: "USER_INPUT",
        isAcceptance: true,
      };

      const result = processTerminationTrigger(state, trigger);

      expect(result.decision.kind).toBe("COMPLETE");
    });
  });
});
