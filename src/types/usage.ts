/**
 * Usage tracking types
 */

export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  sessionStartTime: number;
}

export interface UsageEntry {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
  model?: string;
}

/**
 * Context window tracking for display and compaction
 */
export interface ContextWindowState {
  currentTokens: number;
  maxTokens: number;
  usagePercent: number;
  status: ContextWindowStatus;
  model: string;
}

export type ContextWindowStatus =
  | "normal"
  | "warning"
  | "critical"
  | "compacting";

/**
 * Calculate context window state from usage stats
 */
export const calculateContextState = (
  totalTokens: number,
  maxTokens: number,
  isCompacting: boolean,
): ContextWindowState => {
  const usagePercent = maxTokens > 0 ? (totalTokens / maxTokens) * 100 : 0;

  let status: ContextWindowStatus = "normal";
  if (isCompacting) {
    status = "compacting";
  } else if (usagePercent >= 90) {
    status = "critical";
  } else if (usagePercent >= 75) {
    status = "warning";
  }

  return {
    currentTokens: totalTokens,
    maxTokens,
    usagePercent,
    status,
    model: "",
  };
};
