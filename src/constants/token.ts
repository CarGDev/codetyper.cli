/**
 * Token Counting Constants
 *
 * Configuration for token estimation and context management
 */

// Token estimation ratios
export const CHARS_PER_TOKEN = 4;
export const TOKENS_PER_CHAR = 0.25;

// Context warning thresholds
export const TOKEN_WARNING_THRESHOLD = 0.75; // 75% - yellow warning
export const TOKEN_CRITICAL_THRESHOLD = 0.9; // 90% - red warning
export const TOKEN_OVERFLOW_THRESHOLD = 0.95; // 95% - trigger compaction

export const PRUNE_MINIMUM_TOKENS = 20000; // Min tokens to actually prune
export const PRUNE_PROTECT_TOKENS = 40000; // Threshold before marking for pruning
export const PRUNE_RECENT_TURNS = 2; // Protect last N user turns

// Protected tools that should never be pruned
export const PRUNE_PROTECTED_TOOLS = new Set([
  "skill",
  "todo_read",
  "todo_write",
]);

// Default context sizes
export const DEFAULT_MAX_CONTEXT_TOKENS = 128000;
export const DEFAULT_OUTPUT_TOKENS = 16000;

// Token display formatting
export const TOKEN_DISPLAY = {
  SEPARATOR: "/",
  UNIT_K: "K",
  FORMAT_DECIMALS: 1,
} as const;

// Token status colors (semantic keys for theme lookup)
export const TOKEN_STATUS_COLORS = {
  NORMAL: "textDim",
  WARNING: "warning",
  CRITICAL: "error",
  COMPACTING: "info",
} as const;

// Messages
export const TOKEN_MESSAGES = {
  CONTEXT_LOW: "Context running low",
  CONTEXT_CRITICAL: "Context nearly full",
  COMPACTION_STARTING: "Starting context compaction...",
  COMPACTION_COMPLETE: (saved: number) =>
    `Compaction complete: ${saved.toLocaleString()} tokens freed`,
  OVERFLOW_WARNING: "Context overflow detected",
} as const;
