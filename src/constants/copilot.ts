import type { ProviderModel, ProviderName } from "@/types/providers";

// Provider identification
export const COPILOT_PROVIDER_NAME: ProviderName = "copilot";
export const COPILOT_DISPLAY_NAME = "GitHub Copilot";

// GitHub Copilot API endpoints
export const COPILOT_AUTH_URL =
  "https://api.github.com/copilot_internal/v2/token";
export const COPILOT_MODELS_URL = "https://api.githubcopilot.com/models";

// GitHub OAuth endpoints for device flow
export const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98";
export const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
export const GITHUB_ACCESS_TOKEN_URL =
  "https://github.com/login/oauth/access_token";

// Cache and retry configuration
export const COPILOT_MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const COPILOT_MAX_RETRIES = 3;
export const COPILOT_INITIAL_RETRY_DELAY = 1000; // 1 second

// Streaming timeout and connection retry
export const COPILOT_STREAM_TIMEOUT = 120_000; // 2 minutes
export const COPILOT_CONNECTION_RETRY_DELAY = 2000; // 2 seconds

// Connection error patterns for retry logic
export const CONNECTION_ERROR_PATTERNS = [
  /socket.*closed/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /network.*error/i,
  /fetch.*failed/i,
  /aborted/i,
] as const;

// Default model — gpt-4.1 is unlimited (0x), 111K context, 16K output
// Better than gpt-4o (64K/4K) for agent tasks that need more context/output
export const COPILOT_DEFAULT_MODEL = "gpt-4.1";

// Unlimited fallback model (used when quota is exceeded on premium models)
export const COPILOT_UNLIMITED_MODEL = "gpt-4o";

// Copilot messages
export const COPILOT_MESSAGES = {
  QUOTA_EXCEEDED_SWITCHING: (from: string, to: string) =>
    `Quota exceeded for ${from}. Switching to unlimited model: ${to}`,
  MODEL_SWITCHED: (from: string, to: string) =>
    `Model switched: ${from} → ${to} (quota exceeded)`,
  FORMAT_MULTIPLIER: (multiplier: number) =>
    multiplier === 0 ? "Unlimited" : `${multiplier}x`,
} as const;

// Model cost multipliers from GitHub Copilot
// 0x = Unlimited (no premium request usage)
// Lower multiplier = cheaper, Higher multiplier = more expensive
/**
 * Hardcoded fallback cost multipliers (updated 2026-03-29).
 * API response billing.multiplier is preferred when available.
 */
export const MODEL_COST_MULTIPLIERS: Record<string, number> = {
  // Unlimited models (0x) — verified working via API test 2026-03-30
  "gpt-4o": 0,
  "gpt-4.1": 0,
  "gpt-5-mini": 0,

  // Low cost models (0.25x-0.33x)
  "claude-haiku-4.5": 0.33,
  "gemini-3-flash-preview": 0.33,
  "grok-code-fast-1": 0.25,

  // Standard cost models (1.0x)
  "claude-sonnet-4": 1.0,
  "claude-sonnet-4.5": 1.0,
  "claude-sonnet-4.6": 1.0,
  "gemini-2.5-pro": 1.0,
  "gemini-3.1-pro-preview": 1.0,
  "gpt-5.1": 1.0,
  "gpt-5.2": 1.0,

  // Premium models (3.0x)
  "claude-opus-4.5": 3.0,
  "claude-opus-4.6": 3.0,
};

// Models that are unlimited (0x cost multiplier)
export const UNLIMITED_MODELS = new Set([
  "gpt-4o",
  "gpt-4.1",
  "gpt-5-mini",
]);

// Model context sizes (input tokens, output tokens)
export interface ModelContextSize {
  input: number;
  output: number;
}

/**
 * Hardcoded fallback context sizes (updated 2026-03-29 from Copilot API).
 * These are ONLY used when the API hasn't been fetched yet.
 * The API response is preferred via getModelContextSize().
 */
export const MODEL_CONTEXT_SIZES: Record<string, ModelContextSize> = {
  // Verified working via API test 2026-03-30
  // Unlimited models
  "gpt-4o": { input: 64000, output: 4000 },
  "gpt-4.1": { input: 111000, output: 16000 },
  "gpt-5-mini": { input: 128000, output: 64000 },

  // Premium models (Claude)
  "claude-haiku-4.5": { input: 128000, output: 32000 },
  "claude-sonnet-4": { input: 128000, output: 16000 },
  "claude-sonnet-4.5": { input: 128000, output: 32000 },
  "claude-sonnet-4.6": { input: 128000, output: 32000 },
  "claude-opus-4.5": { input: 128000, output: 32000 },
  "claude-opus-4.6": { input: 128000, output: 64000 },

  // Premium models (Gemini)
  "gemini-2.5-pro": { input: 109000, output: 64000 },
  "gemini-3-flash-preview": { input: 109000, output: 64000 },
  "gemini-3.1-pro-preview": { input: 109000, output: 64000 },

  // Premium models (GPT-5.x)
  "gpt-5.1": { input: 128000, output: 64000 },
  "gpt-5.2": { input: 128000, output: 64000 },

  // Other
  "grok-code-fast-1": { input: 109000, output: 64000 },
};

// Default context size for unknown models
export const DEFAULT_CONTEXT_SIZE: ModelContextSize = {
  input: 128000,
  output: 16000,
};

/**
 * Get context size for a model.
 * Checks API-fetched model data first (via optional models array),
 * then falls back to hardcoded constants, then defaults.
 */
export const getModelContextSize = (
  modelId: string,
  fetchedModels?: ProviderModel[],
): ModelContextSize => {
  // Check API-fetched models first (most accurate, from Copilot API)
  if (fetchedModels) {
    const apiModel = fetchedModels.find((m) => m.id === modelId);
    if (apiModel && (apiModel.maxInputTokens || apiModel.contextWindow)) {
      return {
        input: apiModel.maxInputTokens ?? apiModel.contextWindow ?? DEFAULT_CONTEXT_SIZE.input,
        output: apiModel.maxTokens ?? DEFAULT_CONTEXT_SIZE.output,
      };
    }
  }

  // Fallback to hardcoded constants
  return MODEL_CONTEXT_SIZES[modelId] ?? DEFAULT_CONTEXT_SIZE;
};

// Fallback models when API is unavailable
export const COPILOT_FALLBACK_MODELS: ProviderModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    maxTokens: 4000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 0,
    isUnlimited: true,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    maxTokens: 64000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 0,
    isUnlimited: true,
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    maxTokens: 16000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 1.0,
    isUnlimited: false,
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    maxTokens: 16000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 1.0,
    isUnlimited: false,
  },
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    maxTokens: 16000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 3.0,
    isUnlimited: false,
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    maxTokens: 16000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 1.0,
    isUnlimited: false,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    maxTokens: 128000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 1.0,
    isUnlimited: false,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    maxTokens: 64000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 1.0,
    isUnlimited: false,
  },
  {
    id: "grok-code-fast-1",
    name: "Grok Code Fast 1",
    maxTokens: 64000,
    supportsTools: true,
    supportsStreaming: true,
    costMultiplier: 0,
    isUnlimited: true,
  },
];
