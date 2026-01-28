/**
 * Unit tests for Reasoning Utilities
 */

import { describe, it, expect } from "bun:test";

import {
  estimateTokens,
  tokenize,
  jaccardSimilarity,
  weightedSum,
  extractEntities,
  createEntityTable,
  truncateMiddle,
  foldCode,
  extractCodeBlocks,
  recencyDecay,
  generateId,
  isValidJson,
  hasBalancedBraces,
  countMatches,
  sum,
  unique,
  groupBy,
} from "../utils";

describe("Reasoning Utilities", () => {
  describe("estimateTokens", () => {
    it("should estimate tokens based on character count", () => {
      const text = "Hello world"; // 11 chars
      const tokens = estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it("should handle empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });
  });

  describe("tokenize", () => {
    it("should split text into lowercase tokens", () => {
      const tokens = tokenize("Hello World Test");

      expect(tokens.every((t) => t === t.toLowerCase())).toBe(true);
    });

    it("should filter stop words", () => {
      const tokens = tokenize("the quick brown fox jumps over the lazy dog");

      expect(tokens).not.toContain("the");
      // "over" may or may not be filtered depending on stop words list
      expect(tokens).toContain("quick");
      expect(tokens).toContain("brown");
    });

    it("should filter short tokens", () => {
      const tokens = tokenize("I am a test");

      expect(tokens).not.toContain("i");
      expect(tokens).not.toContain("am");
      expect(tokens).not.toContain("a");
    });

    it("should handle punctuation", () => {
      const tokens = tokenize("Hello, world! How are you?");

      expect(tokens.every((t) => !/[,!?]/.test(t))).toBe(true);
    });
  });

  describe("jaccardSimilarity", () => {
    it("should return 1 for identical sets", () => {
      const similarity = jaccardSimilarity(["a", "b", "c"], ["a", "b", "c"]);

      expect(similarity).toBe(1);
    });

    it("should return 0 for disjoint sets", () => {
      const similarity = jaccardSimilarity(["a", "b", "c"], ["d", "e", "f"]);

      expect(similarity).toBe(0);
    });

    it("should return correct value for partial overlap", () => {
      const similarity = jaccardSimilarity(["a", "b", "c"], ["b", "c", "d"]);

      // Intersection: {b, c} = 2, Union: {a, b, c, d} = 4
      expect(similarity).toBe(0.5);
    });

    it("should handle empty sets", () => {
      expect(jaccardSimilarity([], [])).toBe(0);
      expect(jaccardSimilarity(["a"], [])).toBe(0);
      expect(jaccardSimilarity([], ["a"])).toBe(0);
    });
  });

  describe("weightedSum", () => {
    it("should compute weighted sum correctly", () => {
      const result = weightedSum([1, 2, 3], [0.5, 0.3, 0.2]);

      expect(result).toBeCloseTo(1 * 0.5 + 2 * 0.3 + 3 * 0.2);
    });

    it("should throw for mismatched lengths", () => {
      expect(() => weightedSum([1, 2], [0.5])).toThrow();
    });

    it("should handle empty arrays", () => {
      expect(weightedSum([], [])).toBe(0);
    });
  });

  describe("extractEntities", () => {
    it("should extract file paths", () => {
      const entities = extractEntities(
        "Check the file src/index.ts for details",
        "msg_1",
      );

      expect(
        entities.some((e) => e.type === "FILE" && e.value.includes("index.ts")),
      ).toBe(true);
    });

    it("should extract function names", () => {
      const entities = extractEntities(
        "function handleClick() { return 1; }",
        "msg_1",
      );

      expect(entities.some((e) => e.type === "FUNCTION")).toBe(true);
    });

    it("should extract URLs", () => {
      const entities = extractEntities(
        "Visit https://example.com for more info",
        "msg_1",
      );

      expect(
        entities.some(
          (e) => e.type === "URL" && e.value.includes("example.com"),
        ),
      ).toBe(true);
    });

    it("should set source message ID", () => {
      const entities = extractEntities("file.ts", "test_msg");

      if (entities.length > 0) {
        expect(entities[0].sourceMessageId).toBe("test_msg");
      }
    });
  });

  describe("createEntityTable", () => {
    it("should organize entities by type", () => {
      const entities = [
        {
          type: "FILE" as const,
          value: "test.ts",
          sourceMessageId: "msg_1",
          frequency: 1,
        },
        {
          type: "FILE" as const,
          value: "other.ts",
          sourceMessageId: "msg_1",
          frequency: 1,
        },
        {
          type: "URL" as const,
          value: "https://test.com",
          sourceMessageId: "msg_1",
          frequency: 1,
        },
      ];

      const table = createEntityTable(entities);

      expect(table.byType.FILE).toHaveLength(2);
      expect(table.byType.URL).toHaveLength(1);
    });

    it("should organize entities by source", () => {
      const entities = [
        {
          type: "FILE" as const,
          value: "test.ts",
          sourceMessageId: "msg_1",
          frequency: 1,
        },
        {
          type: "FILE" as const,
          value: "other.ts",
          sourceMessageId: "msg_2",
          frequency: 1,
        },
      ];

      const table = createEntityTable(entities);

      expect(table.bySource["msg_1"]).toHaveLength(1);
      expect(table.bySource["msg_2"]).toHaveLength(1);
    });
  });

  describe("truncateMiddle", () => {
    it("should truncate long text", () => {
      const text = "a".repeat(200);
      const result = truncateMiddle(text, 50, 50);

      expect(result.length).toBeLessThan(text.length);
      expect(result).toContain("truncated");
    });

    it("should not truncate short text", () => {
      const text = "short text";
      const result = truncateMiddle(text, 50, 50);

      expect(result).toBe(text);
    });

    it("should preserve head and tail", () => {
      const text = "HEAD_CONTENT_MIDDLE_STUFF_TAIL_CONTENT";
      const result = truncateMiddle(text, 12, 12);

      expect(result.startsWith("HEAD_CONTENT")).toBe(true);
      expect(result.endsWith("TAIL_CONTENT")).toBe(true);
    });
  });

  describe("foldCode", () => {
    it("should fold long code blocks", () => {
      const code = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join(
        "\n",
      );
      const result = foldCode(code, { keepLines: 5, tailLines: 3 });

      expect(result.split("\n").length).toBeLessThan(50);
      expect(result).toContain("folded");
    });

    it("should not fold short code blocks", () => {
      const code = "line 1\nline 2\nline 3";
      const result = foldCode(code, { keepLines: 5, tailLines: 3 });

      expect(result).toBe(code);
    });

    it("should preserve first and last lines", () => {
      const code = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join(
        "\n",
      );
      const result = foldCode(code, { keepLines: 2, tailLines: 2 });

      expect(result).toContain("line 1");
      expect(result).toContain("line 2");
      expect(result).toContain("line 49");
      expect(result).toContain("line 50");
    });
  });

  describe("extractCodeBlocks", () => {
    it("should extract code blocks with language", () => {
      const text =
        "Here is code:\n```typescript\nconst x = 1;\n```\nMore text.";
      const blocks = extractCodeBlocks(text);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe("typescript");
      expect(blocks[0].content).toContain("const x = 1");
    });

    it("should extract multiple code blocks", () => {
      const text = "```js\ncode1\n```\n\n```python\ncode2\n```";
      const blocks = extractCodeBlocks(text);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].language).toBe("js");
      expect(blocks[1].language).toBe("python");
    });

    it("should handle code blocks without language", () => {
      const text = "```\nsome code\n```";
      const blocks = extractCodeBlocks(text);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe("unknown");
    });

    it("should track positions", () => {
      const text = "Start\n```ts\ncode\n```\nEnd";
      const blocks = extractCodeBlocks(text);

      expect(blocks[0].startIndex).toBeGreaterThan(0);
      expect(blocks[0].endIndex).toBeGreaterThan(blocks[0].startIndex);
    });
  });

  describe("recencyDecay", () => {
    it("should return 1 for current time", () => {
      const now = Date.now();
      const decay = recencyDecay(now, now, 30);

      expect(decay).toBe(1);
    });

    it("should return 0.5 at half-life", () => {
      const now = Date.now();
      const halfLifeAgo = now - 30 * 60 * 1000; // 30 minutes ago
      const decay = recencyDecay(halfLifeAgo, now, 30);

      expect(decay).toBeCloseTo(0.5, 2);
    });

    it("should decrease with age", () => {
      const now = Date.now();
      const recent = recencyDecay(now - 60000, now, 30);
      const old = recencyDecay(now - 3600000, now, 30);

      expect(recent).toBeGreaterThan(old);
    });
  });

  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }

      expect(ids.size).toBe(100);
    });

    it("should include prefix when provided", () => {
      const id = generateId("test");

      expect(id.startsWith("test_")).toBe(true);
    });
  });

  describe("isValidJson", () => {
    it("should return true for valid JSON", () => {
      expect(isValidJson('{"key": "value"}')).toBe(true);
      expect(isValidJson("[1, 2, 3]")).toBe(true);
      expect(isValidJson('"string"')).toBe(true);
    });

    it("should return false for invalid JSON", () => {
      expect(isValidJson("{key: value}")).toBe(false);
      expect(isValidJson("not json")).toBe(false);
      expect(isValidJson("{incomplete")).toBe(false);
    });
  });

  describe("hasBalancedBraces", () => {
    it("should return true for balanced braces", () => {
      expect(hasBalancedBraces("{ foo: { bar: [] } }")).toBe(true);
      expect(hasBalancedBraces("function() { return (a + b); }")).toBe(true);
    });

    it("should return false for unbalanced braces", () => {
      expect(hasBalancedBraces("{ foo: { bar }")).toBe(false);
      expect(hasBalancedBraces("function() { return (a + b); ")).toBe(false);
      expect(hasBalancedBraces("{ ] }")).toBe(false);
    });

    it("should handle empty string", () => {
      expect(hasBalancedBraces("")).toBe(true);
    });
  });

  describe("countMatches", () => {
    it("should count pattern matches", () => {
      expect(countMatches("aaa", /a/g)).toBe(3);
      expect(countMatches("hello world", /o/g)).toBe(2);
    });

    it("should handle no matches", () => {
      expect(countMatches("hello", /z/g)).toBe(0);
    });

    it("should handle case-insensitive patterns", () => {
      expect(countMatches("Hello HELLO hello", /hello/gi)).toBe(3);
    });
  });

  describe("sum", () => {
    it("should sum numbers", () => {
      expect(sum([1, 2, 3])).toBe(6);
      expect(sum([0.1, 0.2, 0.3])).toBeCloseTo(0.6);
    });

    it("should return 0 for empty array", () => {
      expect(sum([])).toBe(0);
    });
  });

  describe("unique", () => {
    it("should remove duplicates", () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(["a", "b", "a"])).toEqual(["a", "b"]);
    });

    it("should handle empty array", () => {
      expect(unique([])).toEqual([]);
    });
  });

  describe("groupBy", () => {
    it("should group by key function", () => {
      const items = [
        { type: "a", value: 1 },
        { type: "b", value: 2 },
        { type: "a", value: 3 },
      ];

      const grouped = groupBy(items, (item) => item.type);

      expect(grouped.a).toHaveLength(2);
      expect(grouped.b).toHaveLength(1);
    });

    it("should handle empty array", () => {
      const grouped = groupBy([], (x: string) => x);

      expect(Object.keys(grouped)).toHaveLength(0);
    });
  });
});
