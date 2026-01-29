/**
 * Ollama provider constants
 */

export const OLLAMA_PROVIDER_NAME = "ollama" as const;
export const OLLAMA_DISPLAY_NAME = "Ollama (Local)";

export const OLLAMA_DEFAULTS = {
  BASE_URL: "http://localhost:11434",
  MODEL: "deepseek-coder:6.7b",
} as const;

export const OLLAMA_ENDPOINTS = {
  TAGS: "/api/tags",
  CHAT: "/api/chat",
  PULL: "/api/pull",
} as const;

export const OLLAMA_TIMEOUTS = {
  VALIDATION: 5000,
  TAGS: 10000,
  CHAT: 120000,
} as const;

export const OLLAMA_CHAT_OPTIONS = {
  DEFAULT_TEMPERATURE: 0.3,
  DEFAULT_MAX_TOKENS: 4096,
} as const;

export const OLLAMA_ERRORS = {
  NOT_RUNNING: (baseUrl: string) =>
    `Ollama not running at ${baseUrl}. Start it with: ollama serve`,
} as const;
