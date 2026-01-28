/**
 * Embedding Constants
 *
 * Configuration for semantic learning retrieval
 */

export const EMBEDDING_DEFAULTS = {
  MODEL: "nomic-embed-text",
  FALLBACK_MODEL: "all-minilm",
  DIMENSIONS: 768,
} as const;

export const EMBEDDING_ENDPOINTS = {
  EMBED: "/api/embed",
} as const;

export const EMBEDDING_TIMEOUTS = {
  EMBED: 30000,
} as const;

export const EMBEDDING_SEARCH = {
  TOP_K: 10,
  MIN_SIMILARITY: 0.3,
  CACHE_TTL_MS: 300000, // 5 minutes
} as const;

export const EMBEDDING_STORAGE = {
  INDEX_FILE: "embeddings.json",
  VERSION: 1,
} as const;
