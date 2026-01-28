/**
 * Semantic Search Service
 *
 * High-level API for semantic learning retrieval
 */

import * as path from "path";

import { EMBEDDING_SEARCH } from "@constants/embeddings";
import {
  getGlobalConfigDir,
  getLocalConfigDir,
} from "@services/project-config";

import type { StoredLearning } from "@/types/learning";
import type {
  EmbeddingIndex,
  SemanticSearchResult,
  SemanticSearchOptions,
  SimilarityResult,
} from "@/types/embeddings";

import {
  embed,
  isEmbeddingAvailable,
  initializeEmbeddingService,
  getEmbeddingModel,
} from "@services/learning/embeddings";

import {
  loadIndex,
  saveIndex,
  upsertEmbedding,
  removeEmbedding,
  findSimilar,
  hasEmbedding,
} from "@services/learning/vector-store";

// =============================================================================
// Index Management
// =============================================================================

let globalIndex: EmbeddingIndex | null = null;
let localIndex: EmbeddingIndex | null = null;

const getGlobalIndexDir = (): string =>
  path.join(getGlobalConfigDir(), "learnings");

const getLocalIndexDir = (): string =>
  path.join(getLocalConfigDir(), "learnings");

/**
 * Initialize or get the global embedding index
 */
const getGlobalIndex = async (): Promise<EmbeddingIndex | null> => {
  if (!isEmbeddingAvailable()) {
    return null;
  }

  if (globalIndex) {
    return globalIndex;
  }

  const model = getEmbeddingModel();
  if (!model) {
    return null;
  }

  globalIndex = await loadIndex(getGlobalIndexDir(), model);
  return globalIndex;
};

/**
 * Initialize or get the local embedding index
 */
const getLocalIndex = async (): Promise<EmbeddingIndex | null> => {
  if (!isEmbeddingAvailable()) {
    return null;
  }

  if (localIndex) {
    return localIndex;
  }

  const model = getEmbeddingModel();
  if (!model) {
    return null;
  }

  localIndex = await loadIndex(getLocalIndexDir(), model);
  return localIndex;
};

/**
 * Save both indexes to disk
 */
const persistIndexes = async (): Promise<void> => {
  if (globalIndex) {
    await saveIndex(getGlobalIndexDir(), globalIndex);
  }
  if (localIndex) {
    await saveIndex(getLocalIndexDir(), localIndex);
  }
};

// =============================================================================
// Embedding Management
// =============================================================================

/**
 * Add embedding for a learning
 */
export const indexLearning = async (
  learning: StoredLearning,
  global: boolean,
): Promise<boolean> => {
  await initializeEmbeddingService();

  if (!isEmbeddingAvailable()) {
    return false;
  }

  const result = await embed(learning.content);
  if (!result) {
    return false;
  }

  const index = global ? await getGlobalIndex() : await getLocalIndex();
  if (!index) {
    return false;
  }

  const updatedIndex = upsertEmbedding(index, learning.id, result.embedding);

  if (global) {
    globalIndex = updatedIndex;
  } else {
    localIndex = updatedIndex;
  }

  await persistIndexes();
  return true;
};

/**
 * Remove embedding for a learning
 */
export const unindexLearning = async (
  learningId: string,
  global: boolean,
): Promise<void> => {
  const index = global ? await getGlobalIndex() : await getLocalIndex();
  if (!index) {
    return;
  }

  const updatedIndex = removeEmbedding(index, learningId);

  if (global) {
    globalIndex = updatedIndex;
  } else {
    localIndex = updatedIndex;
  }

  await persistIndexes();
};

/**
 * Check if a learning has an embedding
 */
export const isLearningIndexed = async (
  learningId: string,
): Promise<boolean> => {
  const gIndex = await getGlobalIndex();
  const lIndex = await getLocalIndex();

  return (
    (gIndex !== null && hasEmbedding(gIndex, learningId)) ||
    (lIndex !== null && hasEmbedding(lIndex, learningId))
  );
};

// =============================================================================
// Semantic Search
// =============================================================================

/**
 * Search learnings by semantic similarity
 */
export const searchLearnings = async (
  query: string,
  learnings: StoredLearning[],
  options: SemanticSearchOptions = {},
): Promise<SemanticSearchResult<StoredLearning>[]> => {
  const {
    topK = EMBEDDING_SEARCH.TOP_K,
    minSimilarity = EMBEDDING_SEARCH.MIN_SIMILARITY,
  } = options;

  await initializeEmbeddingService();

  if (!isEmbeddingAvailable()) {
    // Fallback to keyword matching
    return fallbackKeywordSearch(query, learnings, topK);
  }

  // Embed the query
  const queryResult = await embed(query);
  if (!queryResult) {
    return fallbackKeywordSearch(query, learnings, topK);
  }

  // Search both indexes
  const gIndex = await getGlobalIndex();
  const lIndex = await getLocalIndex();

  const allResults: SimilarityResult[] = [];

  if (gIndex) {
    allResults.push(
      ...findSimilar(gIndex, queryResult.embedding, topK * 2, minSimilarity),
    );
  }

  if (lIndex) {
    allResults.push(
      ...findSimilar(lIndex, queryResult.embedding, topK * 2, minSimilarity),
    );
  }

  // Deduplicate and sort
  const seen = new Set<string>();
  const uniqueResults: SimilarityResult[] = [];

  for (const result of allResults.sort((a, b) => b.score - a.score)) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      uniqueResults.push(result);
    }
  }

  // Map results to learnings
  const learningMap = new Map(learnings.map((l) => [l.id, l]));
  const searchResults: SemanticSearchResult<StoredLearning>[] = [];

  for (let i = 0; i < Math.min(uniqueResults.length, topK); i++) {
    const result = uniqueResults[i];
    const learning = learningMap.get(result.id);

    if (learning) {
      searchResults.push({
        item: learning,
        score: result.score,
        rank: i + 1,
      });
    }
  }

  return searchResults;
};

// =============================================================================
// Fallback Search
// =============================================================================

/**
 * Simple keyword-based search as fallback when embeddings unavailable
 */
const fallbackKeywordSearch = (
  query: string,
  learnings: StoredLearning[],
  topK: number,
): SemanticSearchResult<StoredLearning>[] => {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    // Return most recent if no query tokens
    return learnings.slice(0, topK).map((item, i) => ({
      item,
      score: 1 - i * 0.05,
      rank: i + 1,
    }));
  }

  // Score each learning by token overlap
  const scored = learnings.map((learning) => {
    const contentTokens = tokenize(learning.content);
    const overlap = queryTokens.filter((t) => contentTokens.includes(t)).length;
    const score = overlap / Math.max(queryTokens.length, 1);

    return { learning, score };
  });

  // Sort by score and return top K
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s, i) => ({
      item: s.learning,
      score: s.score,
      rank: i + 1,
    }));
};

/**
 * Simple tokenizer for fallback search
 */
const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);

// =============================================================================
// Index Rebuilding
// =============================================================================

/**
 * Rebuild all embeddings for existing learnings
 */
export const rebuildIndex = async (
  learnings: StoredLearning[],
  global: boolean,
  onProgress?: (current: number, total: number) => void,
): Promise<{ indexed: number; failed: number }> => {
  await initializeEmbeddingService();

  if (!isEmbeddingAvailable()) {
    return { indexed: 0, failed: learnings.length };
  }

  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < learnings.length; i++) {
    const learning = learnings[i];
    const success = await indexLearning(learning, global);

    if (success) {
      indexed++;
    } else {
      failed++;
    }

    onProgress?.(i + 1, learnings.length);
  }

  return { indexed, failed };
};

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear in-memory index cache
 */
export const clearIndexCache = (): void => {
  globalIndex = null;
  localIndex = null;
};

/**
 * Get index statistics
 */
export const getIndexStatistics = async (): Promise<{
  global: { count: number; model: string } | null;
  local: { count: number; model: string } | null;
  embeddingsAvailable: boolean;
}> => {
  await initializeEmbeddingService();

  const gIndex = await getGlobalIndex();
  const lIndex = await getLocalIndex();

  return {
    global: gIndex
      ? { count: Object.keys(gIndex.embeddings).length, model: gIndex.model }
      : null,
    local: lIndex
      ? { count: Object.keys(lIndex.embeddings).length, model: lIndex.model }
      : null,
    embeddingsAvailable: isEmbeddingAvailable(),
  };
};
