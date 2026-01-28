/**
 * Embedding Types
 *
 * Types for semantic learning retrieval
 */

// =============================================================================
// Core Types
// =============================================================================

export type EmbeddingVector = number[];

export interface EmbeddingResult {
  text: string;
  embedding: EmbeddingVector;
  model: string;
  dimensions: number;
}

export interface EmbeddingError {
  code: "MODEL_NOT_FOUND" | "OLLAMA_NOT_RUNNING" | "EMBEDDING_FAILED";
  message: string;
}

// =============================================================================
// Storage Types
// =============================================================================

export interface StoredEmbedding {
  id: string;
  embedding: EmbeddingVector;
  model: string;
  createdAt: number;
}

export interface EmbeddingIndex {
  version: number;
  model: string;
  embeddings: Record<string, StoredEmbedding>;
  lastUpdated: number;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SimilarityResult {
  id: string;
  score: number;
}

export interface SemanticSearchResult<T> {
  item: T;
  score: number;
  rank: number;
}

export interface SemanticSearchOptions {
  topK?: number;
  minSimilarity?: number;
  includeScores?: boolean;
}

// =============================================================================
// Ollama Embed API Types
// =============================================================================

export interface OllamaEmbedRequest {
  model: string;
  input: string | string[];
}

export interface OllamaEmbedResponse {
  model: string;
  embeddings: EmbeddingVector[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
}

// =============================================================================
// Service State
// =============================================================================

export interface EmbeddingServiceState {
  initialized: boolean;
  model: string | null;
  available: boolean;
  error: EmbeddingError | null;
}

// =============================================================================
// Factory Functions
// =============================================================================

export const createEmptyIndex = (model: string): EmbeddingIndex => ({
  version: 1,
  model,
  embeddings: {},
  lastUpdated: Date.now(),
});

export const createInitialServiceState = (): EmbeddingServiceState => ({
  initialized: false,
  model: null,
  available: false,
  error: null,
});
