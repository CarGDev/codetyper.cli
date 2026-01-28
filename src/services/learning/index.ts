/**
 * Learning Service Exports
 *
 * Central export point for all learning-related functionality
 */

// Core persistence
export {
  saveLearning,
  getLearnings,
  learningExists,
} from "@services/learning/persistence";

// Embedding service
export {
  initializeEmbeddingService,
  embed,
  embedBatch,
  isEmbeddingAvailable,
  getEmbeddingModel,
  getEmbeddingError,
  getServiceState,
  resetEmbeddingService,
} from "@services/learning/embeddings";

// Vector store
export {
  cosineSimilarity,
  euclideanDistance,
  loadIndex,
  saveIndex,
  upsertEmbedding,
  removeEmbedding,
  hasEmbedding,
  getEmbedding,
  findSimilar,
  findAboveThreshold,
  getIndexStats,
} from "@services/learning/vector-store";

// Semantic search
export {
  indexLearning,
  unindexLearning,
  isLearningIndexed,
  searchLearnings,
  rebuildIndex,
  clearIndexCache,
  getIndexStatistics,
} from "@services/learning/semantic-search";

// Re-export types
export type {
  StoredLearning,
  LearningCandidate,
  LearningCategory,
} from "@/types/learning";

export type {
  EmbeddingVector,
  EmbeddingResult,
  EmbeddingIndex,
  StoredEmbedding,
  SimilarityResult,
  SemanticSearchResult,
  SemanticSearchOptions,
} from "@/types/embeddings";
