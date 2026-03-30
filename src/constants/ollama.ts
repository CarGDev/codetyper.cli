/**
 * Ollama provider constants
 */

export const OLLAMA_PROVIDER_NAME = "ollama" as const;
export const OLLAMA_DISPLAY_NAME = "Ollama (Local)";

export const OLLAMA_DEFAULTS = {
  BASE_URL: "http://localhost:11434",
  MODEL: "qwen3-coder:30b",
} as const;

/**
 * Model name patterns known to support tool calling in Ollama.
 * Models not matching these patterns will have supportsTools = false.
 */
export const OLLAMA_TOOL_CAPABLE_PATTERNS = [
  "qwen",
  "llama3",
  "llama-3",
  "mistral",
  "mixtral",
  "command-r",
  "gemma2",
  "phi3",
  "phi-3",
  "firefunction",
  "hermes",
  "nous-hermes",
  "deepseek-v2",
  "deepseek-r1",
] as const;

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
