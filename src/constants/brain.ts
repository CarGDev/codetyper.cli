/**
 * Brain API Constants
 *
 * Configuration constants for the CodeTyper Brain service
 */

/**
 * Feature flag to disable all Brain functionality.
 * Set to true to hide Brain menu, disable Brain API calls,
 * and remove Brain-related UI elements.
 */
export const BRAIN_DISABLED = true;

export const BRAIN_PROVIDER_NAME = "brain" as const;
export const BRAIN_DISPLAY_NAME = "CodeTyper Brain";

export const BRAIN_DEFAULTS = {
  BASE_URL: "http://localhost:5001",
  PROJECT_ID: 1,
} as const;

export const BRAIN_ENDPOINTS = {
  // Health
  HEALTH: "/",

  // Authentication
  AUTH_REGISTER: "/auth/register",
  AUTH_LOGIN: "/auth/login",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_REFRESH: "/auth/refresh",
  AUTH_ME: "/auth/me",

  // Knowledge Graph
  KNOWLEDGE_LEARN: "/api/knowledge/learn",
  KNOWLEDGE_RECALL: "/api/knowledge/recall",
  KNOWLEDGE_RELATE: "/api/knowledge/relate",
  KNOWLEDGE_EXTRACT: "/api/knowledge/extract",
  KNOWLEDGE_CONTEXT: "/api/knowledge/context",
  KNOWLEDGE_CONCEPTS: "/api/knowledge/concepts",
  KNOWLEDGE_STATS: "/api/knowledge/stats",

  // Memory
  MEMORY_STATUS: "/api/memory/status",
  MEMORY_STATS: "/api/memory/stats",
  MEMORY_SEARCH: "/api/memory/search",
  MEMORY_STORE: "/api/memory/store",
  MEMORY_TOP: "/api/memory/top",
  MEMORY_FEEDBACK: "/api/memory/feedback",

  // GraphQL (unified endpoint)
  GRAPHQL: "/graphql",
} as const;

export const BRAIN_TIMEOUTS = {
  HEALTH: 3000,
  AUTH: 10000,
  KNOWLEDGE: 15000,
  MEMORY: 10000,
  EXTRACT: 30000,
} as const;

export const BRAIN_ERRORS = {
  NOT_RUNNING: "Brain service not available. Start the API server at localhost:5001",
  NOT_AUTHENTICATED: "Not authenticated. Please login or set an API key.",
  INVALID_API_KEY: "Invalid API key. Please check your credentials.",
  CONNECTION_FAILED: "Failed to connect to Brain service.",
  RECALL_FAILED: "Failed to recall knowledge from Brain.",
  LEARN_FAILED: "Failed to store knowledge in Brain.",
  EXTRACT_FAILED: "Failed to extract concepts from content.",
} as const;

export const BRAIN_MESSAGES = {
  CONNECTED: "Brain connected",
  CONNECTING: "Connecting to Brain...",
  DISCONNECTED: "Brain disconnected",
  LEARNING: "Learning concept...",
  RECALLING: "Recalling knowledge...",
  EXTRACTING: "Extracting concepts...",
} as const;

export const BRAIN_BANNER = {
  TITLE: "CodeTyper has a Brain!",
  CTA: "Login and get an API key to enable long-term memory",
  URL: "http://localhost:5001",
  LOGIN_URL: "http://localhost:5173/docs/login",
  EMOJI_CONNECTED: "🧠",
  EMOJI_DISCONNECTED: "💤",
} as const;

export const BRAIN_HEADERS = {
  API_KEY: "api-key",
  AUTHORIZATION: "Authorization",
  CONTENT_TYPE: "Content-Type",
} as const;
