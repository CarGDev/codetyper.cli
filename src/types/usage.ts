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
