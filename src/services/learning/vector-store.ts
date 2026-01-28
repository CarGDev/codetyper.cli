/**
 * Vector Store
 *
 * Stores and searches embeddings for semantic retrieval
 */

import * as fs from "fs/promises";
import * as path from "path";

import { EMBEDDING_STORAGE, EMBEDDING_SEARCH } from "@constants/embeddings";

import type {
  EmbeddingVector,
  EmbeddingIndex,
  StoredEmbedding,
  SimilarityResult,
} from "@/types/embeddings";

import { createEmptyIndex } from "@/types/embeddings";

// =============================================================================
// Vector Math
// =============================================================================

/**
 * Compute cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export const cosineSimilarity = (
  a: EmbeddingVector,
  b: EmbeddingVector,
): number => {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
};

/**
 * Compute Euclidean distance between two vectors
 */
export const euclideanDistance = (
  a: EmbeddingVector,
  b: EmbeddingVector,
): number => {
  if (a.length !== b.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
};

// =============================================================================
// Index File Operations
// =============================================================================

const getIndexPath = (baseDir: string): string =>
  path.join(baseDir, EMBEDDING_STORAGE.INDEX_FILE);

/**
 * Load embedding index from disk
 */
export const loadIndex = async (
  baseDir: string,
  model: string,
): Promise<EmbeddingIndex> => {
  const indexPath = getIndexPath(baseDir);

  try {
    const data = await fs.readFile(indexPath, "utf-8");
    const index = JSON.parse(data) as EmbeddingIndex;

    // Check version and model compatibility
    if (index.version !== EMBEDDING_STORAGE.VERSION || index.model !== model) {
      // Index is incompatible, create new one
      return createEmptyIndex(model);
    }

    return index;
  } catch {
    // Index doesn't exist or is invalid
    return createEmptyIndex(model);
  }
};

/**
 * Save embedding index to disk
 */
export const saveIndex = async (
  baseDir: string,
  index: EmbeddingIndex,
): Promise<void> => {
  const indexPath = getIndexPath(baseDir);

  await fs.mkdir(baseDir, { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
};

// =============================================================================
// Index Operations
// =============================================================================

/**
 * Add or update an embedding in the index
 */
export const upsertEmbedding = (
  index: EmbeddingIndex,
  id: string,
  embedding: EmbeddingVector,
): EmbeddingIndex => {
  const stored: StoredEmbedding = {
    id,
    embedding,
    model: index.model,
    createdAt: Date.now(),
  };

  return {
    ...index,
    embeddings: {
      ...index.embeddings,
      [id]: stored,
    },
    lastUpdated: Date.now(),
  };
};

/**
 * Remove an embedding from the index
 */
export const removeEmbedding = (
  index: EmbeddingIndex,
  id: string,
): EmbeddingIndex => {
  const { [id]: _, ...remaining } = index.embeddings;

  return {
    ...index,
    embeddings: remaining,
    lastUpdated: Date.now(),
  };
};

/**
 * Check if an embedding exists in the index
 */
export const hasEmbedding = (index: EmbeddingIndex, id: string): boolean =>
  id in index.embeddings;

/**
 * Get an embedding from the index
 */
export const getEmbedding = (
  index: EmbeddingIndex,
  id: string,
): StoredEmbedding | null => index.embeddings[id] ?? null;

// =============================================================================
// Similarity Search
// =============================================================================

/**
 * Find the most similar embeddings to a query vector
 */
export const findSimilar = (
  index: EmbeddingIndex,
  queryVector: EmbeddingVector,
  topK: number = EMBEDDING_SEARCH.TOP_K,
  minSimilarity: number = EMBEDDING_SEARCH.MIN_SIMILARITY,
): SimilarityResult[] => {
  const results: SimilarityResult[] = [];

  for (const [id, stored] of Object.entries(index.embeddings)) {
    const score = cosineSimilarity(queryVector, stored.embedding);

    if (score >= minSimilarity) {
      results.push({ id, score });
    }
  }

  // Sort by score descending and take top K
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
};

/**
 * Find all embeddings above a similarity threshold
 */
export const findAboveThreshold = (
  index: EmbeddingIndex,
  queryVector: EmbeddingVector,
  threshold: number,
): SimilarityResult[] => {
  const results: SimilarityResult[] = [];

  for (const [id, stored] of Object.entries(index.embeddings)) {
    const score = cosineSimilarity(queryVector, stored.embedding);

    if (score >= threshold) {
      results.push({ id, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
};

// =============================================================================
// Index Statistics
// =============================================================================

export const getIndexStats = (
  index: EmbeddingIndex,
): {
  count: number;
  model: string;
  lastUpdated: number;
} => ({
  count: Object.keys(index.embeddings).length,
  model: index.model,
  lastUpdated: index.lastUpdated,
});
