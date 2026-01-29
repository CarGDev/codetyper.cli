/**
 * Unit tests for Vector Store
 */

import { describe, it, expect } from "bun:test";

import {
  cosineSimilarity,
  euclideanDistance,
  upsertEmbedding,
  removeEmbedding,
  hasEmbedding,
  getEmbedding,
  findSimilar,
  findAboveThreshold,
  getIndexStats,
} from "@services/learning/vector-store";

import { createEmptyIndex } from "@/types/embeddings";

describe("Vector Store", () => {
  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];

      expect(cosineSimilarity(a, b)).toBeCloseTo(1);
    });

    it("should return 0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];

      expect(cosineSimilarity(a, b)).toBeCloseTo(0);
    });

    it("should return -1 for opposite vectors", () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];

      expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
    });

    it("should handle normalized vectors", () => {
      const a = [0.6, 0.8, 0];
      const b = [0.8, 0.6, 0];

      const similarity = cosineSimilarity(a, b);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it("should return 0 for mismatched lengths", () => {
      const a = [1, 0, 0];
      const b = [1, 0];

      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it("should handle zero vectors", () => {
      const a = [0, 0, 0];
      const b = [1, 0, 0];

      expect(cosineSimilarity(a, b)).toBe(0);
    });
  });

  describe("euclideanDistance", () => {
    it("should return 0 for identical vectors", () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];

      expect(euclideanDistance(a, b)).toBe(0);
    });

    it("should compute correct distance", () => {
      const a = [0, 0, 0];
      const b = [3, 4, 0];

      expect(euclideanDistance(a, b)).toBe(5);
    });

    it("should return Infinity for mismatched lengths", () => {
      const a = [1, 0, 0];
      const b = [1, 0];

      expect(euclideanDistance(a, b)).toBe(Infinity);
    });
  });

  describe("Index Operations", () => {
    it("should create empty index", () => {
      const index = createEmptyIndex("test-model");

      expect(index.version).toBe(1);
      expect(index.model).toBe("test-model");
      expect(Object.keys(index.embeddings)).toHaveLength(0);
    });

    it("should upsert embedding", () => {
      let index = createEmptyIndex("test-model");
      const embedding = [0.1, 0.2, 0.3];

      index = upsertEmbedding(index, "learn_1", embedding);

      expect(hasEmbedding(index, "learn_1")).toBe(true);
      expect(getEmbedding(index, "learn_1")?.embedding).toEqual(embedding);
    });

    it("should update existing embedding", () => {
      let index = createEmptyIndex("test-model");
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      index = upsertEmbedding(index, "learn_1", embedding1);
      index = upsertEmbedding(index, "learn_1", embedding2);

      expect(getEmbedding(index, "learn_1")?.embedding).toEqual(embedding2);
    });

    it("should remove embedding", () => {
      let index = createEmptyIndex("test-model");
      index = upsertEmbedding(index, "learn_1", [0.1, 0.2, 0.3]);
      index = upsertEmbedding(index, "learn_2", [0.4, 0.5, 0.6]);

      index = removeEmbedding(index, "learn_1");

      expect(hasEmbedding(index, "learn_1")).toBe(false);
      expect(hasEmbedding(index, "learn_2")).toBe(true);
    });

    it("should return null for missing embedding", () => {
      const index = createEmptyIndex("test-model");

      expect(getEmbedding(index, "nonexistent")).toBeNull();
    });

    it("should track index stats", () => {
      let index = createEmptyIndex("test-model");
      index = upsertEmbedding(index, "learn_1", [0.1, 0.2, 0.3]);
      index = upsertEmbedding(index, "learn_2", [0.4, 0.5, 0.6]);

      const stats = getIndexStats(index);

      expect(stats.count).toBe(2);
      expect(stats.model).toBe("test-model");
    });
  });

  describe("Similarity Search", () => {
    it("should find similar embeddings", () => {
      let index = createEmptyIndex("test-model");

      // Add embeddings with known similarities
      index = upsertEmbedding(index, "a", [1, 0, 0]);
      index = upsertEmbedding(index, "b", [0.9, 0.1, 0]);
      index = upsertEmbedding(index, "c", [0, 1, 0]);

      const query = [1, 0, 0];
      const results = findSimilar(index, query, 2, 0);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("a");
      expect(results[0].score).toBeCloseTo(1);
      expect(results[1].id).toBe("b");
    });

    it("should respect minSimilarity threshold", () => {
      let index = createEmptyIndex("test-model");

      index = upsertEmbedding(index, "a", [1, 0, 0]);
      index = upsertEmbedding(index, "b", [0, 1, 0]);

      const query = [1, 0, 0];
      const results = findSimilar(index, query, 10, 0.5);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("a");
    });

    it("should limit results to topK", () => {
      let index = createEmptyIndex("test-model");

      for (let i = 0; i < 10; i++) {
        const embedding = [Math.random(), Math.random(), Math.random()];
        index = upsertEmbedding(index, `learn_${i}`, embedding);
      }

      const query = [0.5, 0.5, 0.5];
      const results = findSimilar(index, query, 3, 0);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should find all above threshold", () => {
      let index = createEmptyIndex("test-model");

      index = upsertEmbedding(index, "a", [1, 0, 0]);
      index = upsertEmbedding(index, "b", [0.95, 0.05, 0]);
      index = upsertEmbedding(index, "c", [0.9, 0.1, 0]);
      index = upsertEmbedding(index, "d", [0, 1, 0]);

      const query = [1, 0, 0];
      const results = findAboveThreshold(index, query, 0.85);

      expect(results.length).toBe(3);
      expect(results.map((r) => r.id)).toContain("a");
      expect(results.map((r) => r.id)).toContain("b");
      expect(results.map((r) => r.id)).toContain("c");
    });

    it("should return empty array for no matches", () => {
      let index = createEmptyIndex("test-model");

      index = upsertEmbedding(index, "a", [1, 0, 0]);

      const query = [-1, 0, 0];
      const results = findSimilar(index, query, 10, 0.5);

      expect(results).toHaveLength(0);
    });

    it("should handle empty index", () => {
      const index = createEmptyIndex("test-model");
      const query = [1, 0, 0];
      const results = findSimilar(index, query, 10, 0);

      expect(results).toHaveLength(0);
    });
  });
});
