/**
 * Provider constants
 */

import type { ProviderInfoRegistry } from "@/types/providers";

export const PROVIDER_INFO: ProviderInfoRegistry = {
  copilot: {
    envVar: "GitHub OAuth via device flow",
    description: "GitHub Copilot - authenticate via GitHub device flow",
  },
  ollama: {
    envVar: "OLLAMA_HOST (default: http://localhost:11434)",
    description: "Local Ollama models - no API key needed",
  },
};

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

export const CREDENTIALS_FILE_MODE = 0o600;

export const MAX_MODELS_DISPLAY = 10;
