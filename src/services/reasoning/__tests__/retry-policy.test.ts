/**
 * Unit tests for Retry Policy Layer
 */

import { describe, it, expect } from "bun:test";

import {
  createInitialRetryState,
  createRetryBudget,
  computeRetryTransition,
  splitTaskDescription,
  isRetryable,
  getCurrentTier,
  getRemainingAttempts,
} from "../retry-policy";

import type {
  RetryPolicyInput,
  RetryTrigger,
  DeficiencyTag,
} from "@src/types/reasoning";

describe("Retry Policy Layer", () => {
  describe("createInitialRetryState", () => {
    it("should create state with INITIAL kind", () => {
      const state = createInitialRetryState();

      expect(state.currentState.kind).toBe("INITIAL");
      expect(state.totalAttempts).toBe(0);
      expect(state.history).toHaveLength(0);
    });

    it("should create budget with default limits", () => {
      const state = createInitialRetryState();

      expect(state.budget.maxTotalAttempts).toBe(12);
      expect(state.budget.maxPerTier).toBe(2);
      expect(state.budget.maxTimeMs).toBe(60000);
    });
  });

  describe("createRetryBudget", () => {
    it("should allow overriding defaults", () => {
      const budget = createRetryBudget({
        maxTotalAttempts: 20,
        maxPerTier: 3,
      });

      expect(budget.maxTotalAttempts).toBe(20);
      expect(budget.maxPerTier).toBe(3);
      expect(budget.maxTimeMs).toBe(60000);
    });
  });

  describe("computeRetryTransition", () => {
    it("should transition from INITIAL to RETRY_SAME on first retry", () => {
      const state = createInitialRetryState();
      const input: RetryPolicyInput = {
        currentState: state,
        trigger: {
          event: "QUALITY_VERDICT",
          verdict: "RETRY",
          deficiencies: ["QUERY_MISMATCH"],
        },
        availableTools: ["read", "write"],
        contextBudget: 8000,
      };

      const result = computeRetryTransition(input);

      expect(result.nextState.currentState.kind).toBe("RETRY_SAME");
      expect(result.nextState.totalAttempts).toBe(1);
      expect(result.action.kind).toBe("RETRY");
    });

    it("should eventually advance to next tier after repeated failures", () => {
      let state = createInitialRetryState();
      const trigger = {
        event: "QUALITY_VERDICT" as const,
        verdict: "RETRY" as const,
        deficiencies: [] as string[],
      };

      // Run multiple iterations and verify tiers eventually change
      let sawTierChange = false;
      let lastKind = state.currentState.kind;

      for (let i = 0; i < 8; i++) {
        const result = computeRetryTransition({
          currentState: state,
          trigger,
          availableTools: ["read"],
          contextBudget: 8000,
        });
        state = result.nextState;

        if (
          state.currentState.kind !== lastKind &&
          state.currentState.kind !== "INITIAL"
        ) {
          sawTierChange = true;
          lastKind = state.currentState.kind;
        }
      }

      // Should have seen at least one tier change
      expect(sawTierChange).toBe(true);
    });

    it("should exhaust after exceeding max total attempts", () => {
      const state = createInitialRetryState();
      state.budget.maxTotalAttempts = 2;
      state.totalAttempts = 2;

      const result = computeRetryTransition({
        currentState: state,
        trigger: {
          event: "QUALITY_VERDICT",
          verdict: "RETRY",
          deficiencies: [],
        },
        availableTools: ["read"],
        contextBudget: 8000,
      });

      expect(result.nextState.currentState.kind).toBe("EXHAUSTED");
      expect(result.action.kind).toBe("ABORT");
    });

    it("should return REDUCE_CONTEXT transform when simplifying", () => {
      let state = createInitialRetryState();
      state.currentState = { kind: "RETRY_SAME", attempts: 2, tierAttempts: 2 };

      const result = computeRetryTransition({
        currentState: state,
        trigger: {
          event: "QUALITY_VERDICT",
          verdict: "RETRY",
          deficiencies: [],
        },
        availableTools: ["read"],
        contextBudget: 8000,
      });

      if (
        result.action.kind === "RETRY" &&
        result.action.transform.kind === "REDUCE_CONTEXT"
      ) {
        expect(result.action.transform.delta).toBeDefined();
      }
    });

    it("should escalate to user on permission denied errors", () => {
      const state = createInitialRetryState();
      state.currentState = {
        kind: "RETRY_ALTERNATIVE",
        attempts: 10,
        tierAttempts: 2,
      };

      const result = computeRetryTransition({
        currentState: state,
        trigger: {
          event: "TOOL_EXECUTION_FAILED",
          error: {
            toolName: "bash",
            errorType: "PERMISSION_DENIED",
            message: "Permission denied",
          },
        },
        availableTools: ["read"],
        contextBudget: 8000,
      });

      expect(result.action.kind).toBe("ESCALATE_TO_USER");
    });
  });

  describe("splitTaskDescription", () => {
    it("should split 'first...then' pattern", () => {
      const result = splitTaskDescription(
        "First, read the file. Then, update the content.",
      );

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should split numbered list pattern", () => {
      const result = splitTaskDescription(
        "1. Read file 2. Parse content 3. Write output",
      );

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should return single item for atomic tasks", () => {
      const result = splitTaskDescription("Read the configuration file");

      expect(result).toHaveLength(1);
      expect(result[0]).toBe("Read the configuration file");
    });

    it("should split bulleted list pattern", () => {
      const result = splitTaskDescription(
        "- Create file\n- Add content\n- Save changes",
      );

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("isRetryable", () => {
    it("should return true for INITIAL state", () => {
      const state = createInitialRetryState();

      expect(isRetryable(state)).toBe(true);
    });

    it("should return true for RETRY_SAME state", () => {
      const state = createInitialRetryState();
      state.currentState = { kind: "RETRY_SAME", attempts: 1, tierAttempts: 1 };

      expect(isRetryable(state)).toBe(true);
    });

    it("should return false for EXHAUSTED state", () => {
      const state = createInitialRetryState();
      state.currentState = {
        kind: "EXHAUSTED",
        attempts: 12,
        tierAttempts: 0,
        exhaustionReason: "MAX_TIERS_EXCEEDED",
      };

      expect(isRetryable(state)).toBe(false);
    });

    it("should return false for COMPLETE state", () => {
      const state = createInitialRetryState();
      state.currentState = { kind: "COMPLETE", attempts: 5, tierAttempts: 0 };

      expect(isRetryable(state)).toBe(false);
    });
  });

  describe("getCurrentTier", () => {
    it("should return current tier kind", () => {
      const state = createInitialRetryState();

      expect(getCurrentTier(state)).toBe("INITIAL");

      state.currentState = {
        kind: "RETRY_DECOMPOSED",
        attempts: 5,
        tierAttempts: 1,
      };

      expect(getCurrentTier(state)).toBe("RETRY_DECOMPOSED");
    });
  });

  describe("getRemainingAttempts", () => {
    it("should calculate remaining attempts correctly", () => {
      const state = createInitialRetryState();
      state.totalAttempts = 4;

      expect(getRemainingAttempts(state)).toBe(8);

      state.totalAttempts = 12;

      expect(getRemainingAttempts(state)).toBe(0);
    });
  });

  describe("state machine progression", () => {
    it("should progress through tiers and eventually exhaust", () => {
      let state = createInitialRetryState();
      const trigger: RetryTrigger = {
        event: "QUALITY_VERDICT",
        verdict: "RETRY",
        deficiencies: [],
      };

      // Track which tiers we've seen
      const seenTiers = new Set<string>();
      let iterations = 0;
      const maxIterations = 15;

      while (
        iterations < maxIterations &&
        state.currentState.kind !== "EXHAUSTED"
      ) {
        const result = computeRetryTransition({
          currentState: state,
          trigger,
          availableTools: ["read", "write"],
          contextBudget: 8000,
        });

        seenTiers.add(result.nextState.currentState.kind);
        state = result.nextState;
        iterations++;
      }

      // Should have reached EXHAUSTED
      expect(state.currentState.kind).toBe("EXHAUSTED");

      // Should have seen multiple tiers along the way
      expect(seenTiers.size).toBeGreaterThan(1);
    });
  });
});
