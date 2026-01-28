/**
 * Log Panel Utility Functions
 */

import type { LogEntry, LogEntryType } from "@/types/tui";
import { LOG_ENTRY_EXTRA_LINES } from "@constants/tui-components";
import { isDiffContent } from "@tui/components/DiffView";

const ENTRY_LINES_CONFIG: Record<LogEntryType, number> = {
  user: LOG_ENTRY_EXTRA_LINES.user,
  assistant: LOG_ENTRY_EXTRA_LINES.assistant,
  assistant_streaming: LOG_ENTRY_EXTRA_LINES.assistant,
  tool: LOG_ENTRY_EXTRA_LINES.tool,
  error: LOG_ENTRY_EXTRA_LINES.default,
  system: LOG_ENTRY_EXTRA_LINES.default,
  thinking: LOG_ENTRY_EXTRA_LINES.default,
};

/**
 * Estimate lines needed for a log entry (rough calculation)
 */
export const estimateEntryLines = (entry: LogEntry): number => {
  const contentLines = entry.content.split("\n").length;
  const baseExtra =
    ENTRY_LINES_CONFIG[entry.type] ?? LOG_ENTRY_EXTRA_LINES.default;

  // Diff views take more space
  if (
    entry.type === "tool" &&
    (entry.metadata?.diffData?.isDiff || isDiffContent(entry.content))
  ) {
    return contentLines + LOG_ENTRY_EXTRA_LINES.toolWithDiff;
  }

  return contentLines + baseExtra;
};
