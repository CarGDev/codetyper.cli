/**
 * Unit tests for Permission Pattern Index
 */

import { describe, it, expect } from "bun:test";

import {
  createPatternIndex,
  buildPatternIndex,
  addToIndex,
  removeFromIndex,
  getPatternsForTool,
  hasPattern,
  getRawPatterns,
  mergeIndexes,
  getIndexStats,
} from "@services/permissions/pattern-index";

describe("Permission Pattern Index", () => {
  describe("createPatternIndex", () => {
    it("should create empty index", () => {
      const index = createPatternIndex();

      expect(index.all).toHaveLength(0);
      expect(index.byTool.size).toBe(0);
    });
  });

  describe("buildPatternIndex", () => {
    it("should build index from patterns", () => {
      const patterns = [
        "Bash(git:*)",
        "Bash(npm install:*)",
        "Read(*)",
        "Write(src/*)",
      ];

      const index = buildPatternIndex(patterns);

      expect(index.all).toHaveLength(4);
      expect(index.byTool.get("Bash")).toHaveLength(2);
      expect(index.byTool.get("Read")).toHaveLength(1);
      expect(index.byTool.get("Write")).toHaveLength(1);
    });

    it("should skip invalid patterns", () => {
      const patterns = ["Bash(git:*)", "invalid pattern", "Read(*)"];

      const index = buildPatternIndex(patterns);

      expect(index.all).toHaveLength(2);
    });

    it("should handle empty array", () => {
      const index = buildPatternIndex([]);

      expect(index.all).toHaveLength(0);
    });
  });

  describe("addToIndex", () => {
    it("should add pattern to index", () => {
      let index = createPatternIndex();
      index = addToIndex(index, "Bash(git:*)");

      expect(index.all).toHaveLength(1);
      expect(hasPattern(index, "Bash(git:*)")).toBe(true);
    });

    it("should not duplicate patterns", () => {
      let index = buildPatternIndex(["Bash(git:*)"]);
      index = addToIndex(index, "Bash(git:*)");

      expect(index.all).toHaveLength(1);
    });

    it("should add to correct tool bucket", () => {
      let index = createPatternIndex();
      index = addToIndex(index, "Read(src/*)");

      expect(getPatternsForTool(index, "Read")).toHaveLength(1);
      expect(getPatternsForTool(index, "Bash")).toHaveLength(0);
    });
  });

  describe("removeFromIndex", () => {
    it("should remove pattern from index", () => {
      let index = buildPatternIndex(["Bash(git:*)", "Read(*)"]);
      index = removeFromIndex(index, "Bash(git:*)");

      expect(index.all).toHaveLength(1);
      expect(hasPattern(index, "Bash(git:*)")).toBe(false);
      expect(hasPattern(index, "Read(*)")).toBe(true);
    });

    it("should handle non-existent pattern", () => {
      const index = buildPatternIndex(["Bash(git:*)"]);
      const result = removeFromIndex(index, "Read(*)");

      expect(result.all).toHaveLength(1);
    });
  });

  describe("getPatternsForTool", () => {
    it("should return patterns for specific tool", () => {
      const index = buildPatternIndex([
        "Bash(git:*)",
        "Bash(npm:*)",
        "Read(*)",
      ]);

      const bashPatterns = getPatternsForTool(index, "Bash");
      const readPatterns = getPatternsForTool(index, "Read");
      const writePatterns = getPatternsForTool(index, "Write");

      expect(bashPatterns).toHaveLength(2);
      expect(readPatterns).toHaveLength(1);
      expect(writePatterns).toHaveLength(0);
    });
  });

  describe("getRawPatterns", () => {
    it("should return all raw pattern strings", () => {
      const patterns = ["Bash(git:*)", "Read(*)"];
      const index = buildPatternIndex(patterns);

      const raw = getRawPatterns(index);

      expect(raw).toEqual(patterns);
    });
  });

  describe("mergeIndexes", () => {
    it("should merge multiple indexes", () => {
      const index1 = buildPatternIndex(["Bash(git:*)"]);
      const index2 = buildPatternIndex(["Read(*)"]);
      const index3 = buildPatternIndex(["Write(src/*)"]);

      const merged = mergeIndexes(index1, index2, index3);

      expect(merged.all).toHaveLength(3);
      expect(getPatternsForTool(merged, "Bash")).toHaveLength(1);
      expect(getPatternsForTool(merged, "Read")).toHaveLength(1);
      expect(getPatternsForTool(merged, "Write")).toHaveLength(1);
    });

    it("should preserve duplicates from different indexes", () => {
      const index1 = buildPatternIndex(["Bash(git:*)"]);
      const index2 = buildPatternIndex(["Bash(git:*)"]);

      const merged = mergeIndexes(index1, index2);

      // Duplicates preserved (session might override global)
      expect(merged.all).toHaveLength(2);
    });

    it("should handle empty indexes", () => {
      const index1 = createPatternIndex();
      const index2 = buildPatternIndex(["Read(*)"]);

      const merged = mergeIndexes(index1, index2);

      expect(merged.all).toHaveLength(1);
    });
  });

  describe("getIndexStats", () => {
    it("should return correct statistics", () => {
      const index = buildPatternIndex([
        "Bash(git:*)",
        "Bash(npm:*)",
        "Read(*)",
        "Write(src/*)",
        "Edit(*.ts)",
      ]);

      const stats = getIndexStats(index);

      expect(stats.total).toBe(5);
      expect(stats.byTool["Bash"]).toBe(2);
      expect(stats.byTool["Read"]).toBe(1);
      expect(stats.byTool["Write"]).toBe(1);
      expect(stats.byTool["Edit"]).toBe(1);
    });
  });
});
