/**
 * Unit tests for Quality Evaluation Layer
 */

import { describe, it, expect } from "bun:test";

import {
  evaluateQuality,
  computeVerdict,
  hasHallucinationMarkers,
  hasContradiction,
} from "../quality-evaluation";

import type {
  QualityEvalInput,
  TaskConstraints,
  AttemptRecord,
} from "@src/types/reasoning";

describe("Quality Evaluation Layer", () => {
  const createDefaultInput = (
    overrides: Partial<QualityEvalInput> = {},
  ): QualityEvalInput => ({
    responseText: "Here is the solution to your problem.",
    responseToolCalls: [],
    expectedType: "text",
    queryTokens: ["solution", "problem"],
    queryEntities: [],
    previousAttempts: [],
    taskConstraints: {
      requiredOutputs: [],
      expectedToolCalls: [],
      maxResponseTokens: 4000,
      requiresCode: false,
    },
    ...overrides,
  });

  describe("evaluateQuality", () => {
    it("should accept a high-quality text response", () => {
      const input = createDefaultInput({
        responseText:
          "Here is the solution to your problem. I've analyzed the issue and found the root cause.",
        queryTokens: ["solution", "problem", "analyze", "issue"],
      });

      const result = evaluateQuality(input);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.verdict).toBe("ACCEPT");
      expect(result.deficiencies).toHaveLength(0);
    });

    it("should reject an empty response", () => {
      const input = createDefaultInput({
        responseText: "",
        responseToolCalls: [],
      });

      const result = evaluateQuality(input);

      expect(result.verdict).not.toBe("ACCEPT");
      expect(result.deficiencies).toContain("EMPTY_RESPONSE");
    });

    it("should detect missing tool calls when expected", () => {
      const input = createDefaultInput({
        responseText: "I will read the file now.",
        responseToolCalls: [],
        expectedType: "tool_call",
        taskConstraints: {
          requiredOutputs: [],
          expectedToolCalls: ["read"],
          maxResponseTokens: 4000,
          requiresCode: false,
        },
      });

      const result = evaluateQuality(input);

      expect(result.deficiencies).toContain("MISSING_TOOL_CALL");
    });

    it("should accept response with tool calls when expected", () => {
      const input = createDefaultInput({
        responseText: "Let me read that file.",
        responseToolCalls: [
          { id: "1", name: "read", arguments: { path: "/test.ts" } },
        ],
        expectedType: "tool_call",
        taskConstraints: {
          requiredOutputs: [],
          expectedToolCalls: ["read"],
          maxResponseTokens: 4000,
          requiresCode: false,
        },
      });

      const result = evaluateQuality(input);

      expect(result.score).toBeGreaterThan(0.5);
    });

    it("should detect query mismatch", () => {
      const input = createDefaultInput({
        responseText: "The weather today is sunny and warm.",
        queryTokens: ["database", "migration", "schema", "postgresql"],
      });

      const result = evaluateQuality(input);

      // With no token overlap, relevance should be lower than perfect match
      expect(result.metrics.relevance).toBeLessThan(1);
    });

    it("should detect incomplete code when required", () => {
      const input = createDefaultInput({
        responseText: "Here is some text without any code.",
        taskConstraints: {
          requiredOutputs: [],
          expectedToolCalls: [],
          maxResponseTokens: 4000,
          requiresCode: true,
          codeLanguage: "typescript",
        },
      });

      const result = evaluateQuality(input);

      expect(result.deficiencies).toContain("INCOMPLETE_CODE");
    });

    it("should accept valid code block when required", () => {
      const input = createDefaultInput({
        responseText:
          "Here is the function:\n\n```typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```",
        taskConstraints: {
          requiredOutputs: [],
          expectedToolCalls: [],
          maxResponseTokens: 4000,
          requiresCode: true,
          codeLanguage: "typescript",
        },
      });

      const result = evaluateQuality(input);

      expect(result.deficiencies).not.toContain("INCOMPLETE_CODE");
      expect(result.deficiencies).not.toContain("WRONG_LANGUAGE");
    });
  });

  describe("computeVerdict", () => {
    it("should return ACCEPT for score >= 0.70", () => {
      expect(computeVerdict(0.7)).toBe("ACCEPT");
      expect(computeVerdict(0.85)).toBe("ACCEPT");
      expect(computeVerdict(1.0)).toBe("ACCEPT");
    });

    it("should return RETRY for score between 0.40 and 0.70", () => {
      expect(computeVerdict(0.69)).toBe("RETRY");
      expect(computeVerdict(0.55)).toBe("RETRY");
      expect(computeVerdict(0.4)).toBe("RETRY");
    });

    it("should return ESCALATE for score between 0.20 and 0.40", () => {
      expect(computeVerdict(0.39)).toBe("ESCALATE");
      expect(computeVerdict(0.3)).toBe("ESCALATE");
      expect(computeVerdict(0.2)).toBe("ESCALATE");
    });

    it("should return ABORT for score < 0.20", () => {
      expect(computeVerdict(0.19)).toBe("ABORT");
      expect(computeVerdict(0.1)).toBe("ABORT");
      expect(computeVerdict(0)).toBe("ABORT");
    });
  });

  describe("hasHallucinationMarkers", () => {
    it("should detect 'I don't have access' pattern", () => {
      expect(
        hasHallucinationMarkers(
          "I don't have access to the file but I'll assume...",
        ),
      ).toBe(true);
    });

    it("should detect 'assuming exists' pattern", () => {
      expect(
        hasHallucinationMarkers(
          "Assuming the function exists, here's how to use it",
        ),
      ).toBe(true);
    });

    it("should detect placeholder pattern", () => {
      expect(
        hasHallucinationMarkers("Replace [placeholder] with your value"),
      ).toBe(true);
    });

    it("should not flag normal responses", () => {
      expect(
        hasHallucinationMarkers("Here is the implementation you requested."),
      ).toBe(false);
    });
  });

  describe("hasContradiction", () => {
    it("should detect 'but actually' pattern", () => {
      expect(
        hasContradiction(
          "The function returns true, but actually it returns false",
        ),
      ).toBe(true);
    });

    it("should detect 'wait, no' pattern", () => {
      expect(
        hasContradiction(
          "It's in the utils folder. Wait, no, it's in helpers.",
        ),
      ).toBe(true);
    });

    it("should detect 'on second thought' pattern", () => {
      expect(
        hasContradiction(
          "Let me use forEach. On second thought, I'll use map.",
        ),
      ).toBe(true);
    });

    it("should not flag normal responses", () => {
      expect(
        hasContradiction(
          "The function takes two parameters and returns their sum.",
        ),
      ).toBe(false);
    });
  });

  describe("structural validation", () => {
    it("should detect malformed code blocks", () => {
      const input = createDefaultInput({
        responseText:
          "Here is the code:\n```typescript\nfunction test() {\n  return 1;\n", // Missing closing ```
      });

      const result = evaluateQuality(input);

      expect(result.metrics.structural).toBeLessThan(1);
    });

    it("should accept well-formed code blocks", () => {
      const input = createDefaultInput({
        responseText:
          "Here is the code:\n```typescript\nfunction test() {\n  return 1;\n}\n```",
      });

      const result = evaluateQuality(input);

      expect(result.metrics.structural).toBeGreaterThan(0.5);
    });

    it("should detect unbalanced braces", () => {
      const input = createDefaultInput({
        responseText: "The object is { name: 'test', value: { nested: true }",
      });

      const result = evaluateQuality(input);

      expect(result.metrics.structural).toBeLessThan(1);
    });
  });
});
