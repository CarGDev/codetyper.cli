import type { SessionStats, ModelUsage, ModifiedFileEntry } from "@/types/tui";

/**
 * Format milliseconds to human readable duration
 * e.g., 40m 28.641s, 16h 3m 29.775s
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${(ms / 1000).toFixed(3)}s`;
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  
  const fractionalSeconds = ((ms % 1000) / 1000).toFixed(3).slice(1); // .641
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}${fractionalSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}${fractionalSeconds}s`;
  }
  return `${seconds}${fractionalSeconds}s`;
}

/**
 * Format tokens for display (e.g., "4.2m", "193.7k")
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}m`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return tokens.toString();
}

/**
 * Calculate total additions and deletions from modified files
 */
export function calculateCodeChanges(files: ModifiedFileEntry[]): { additions: number; deletions: number } {
  return files.reduce(
    (acc, file) => ({
      additions: acc.additions + file.additions,
      deletions: acc.deletions + file.deletions,
    }),
    { additions: 0, deletions: 0 }
  );
}

/**
 * Format model usage line for display
 * e.g., "gpt-5-mini              4.2m in, 193.7k out, 3.4m cached (Est. 0 Premium requests)"
 */
export function formatModelUsage(usage: ModelUsage): string {
  const parts: string[] = [];
  
  if (usage.inputTokens > 0) {
    parts.push(`${formatTokens(usage.inputTokens)} in`);
  }
  if (usage.outputTokens > 0) {
    parts.push(`${formatTokens(usage.outputTokens)} out`);
  }
  if (usage.cachedTokens && usage.cachedTokens > 0) {
    parts.push(`${formatTokens(usage.cachedTokens)} cached`);
  }
  
  return parts.join(", ") || "0 tokens";
}

/**
 * Generate the session summary display
 */
export interface SessionSummaryInput {
  sessionId: string;
  sessionStats: SessionStats;
  modifiedFiles: ModifiedFileEntry[];
  modelName?: string;
  providerName?: string;
}

export function generateSessionSummary(input: SessionSummaryInput): string {
  const { sessionId, sessionStats, modifiedFiles, modelName, providerName } = input;
  
  const { additions, deletions } = calculateCodeChanges(modifiedFiles);
  const totalSessionTime = Date.now() - sessionStats.startTime;
  
  // Build the summary lines
  const lines: string[] = [
    "",
    "═══════════════════════════════════════════════════════════════",
    "",
    ` Total usage est:        0 Premium requests`,
    ` API time spent:         ${formatDuration(sessionStats.apiTimeSpent)}`,
    ` Total session time:     ${formatDuration(totalSessionTime)}`,
    ` Total code changes:     +${additions} -${deletions}`,
    "",
  ];
  
  // Add model breakdown if available
  if (sessionStats.modelUsage.length > 0) {
    lines.push(" Breakdown by AI model:");
    
    for (const usage of sessionStats.modelUsage) {
      const displayModel = usage.modelId.length > 20 
        ? usage.modelId.slice(0, 17) + "..."
        : usage.modelId;
      const padding = " ".repeat(Math.max(1, 24 - displayModel.length));
      const usageStr = formatModelUsage(usage);
      lines.push(`  ${displayModel}${padding}${usageStr} (Est. 0 Premium requests)`);
    }
    lines.push("");
  } else if (modelName) {
    // Fallback to current model if no detailed usage tracked
    const displayModel = modelName.length > 20 ? modelName.slice(0, 17) + "..." : modelName;
    const padding = " ".repeat(Math.max(1, 24 - displayModel.length));
    const totalIn = sessionStats.inputTokens;
    const totalOut = sessionStats.outputTokens;
    lines.push(" Breakdown by AI model:");
    lines.push(`  ${displayModel}${padding}${formatTokens(totalIn)} in, ${formatTokens(totalOut)} out (Est. 0 Premium requests)`);
    lines.push("");
  }
  
  // Add resume command
  lines.push(` Resume this session with copilot --resume=${sessionId}`);
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  
  return lines.join("\n");
}
