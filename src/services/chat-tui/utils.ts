/**
 * Chat TUI utility functions
 */

import { CHAT_TRUNCATE_DEFAULTS, DIFF_PATTERNS } from "@constants/chat-service";
import type { DiffResult } from "@/types/chat-service";

export const stripAnsi = (str: string): string =>
  str.replace(/\x1b\[[0-9;]*m/g, "");

export const truncateOutput = (
  output: string,
  maxLines = CHAT_TRUNCATE_DEFAULTS.MAX_LINES,
  maxLength = CHAT_TRUNCATE_DEFAULTS.MAX_LENGTH,
): string => {
  if (!output) return "";

  const lines = output.split("\n");
  let truncated = lines.slice(0, maxLines).join("\n");

  if (truncated.length > maxLength) {
    truncated = truncated.slice(0, maxLength) + "...";
  } else if (lines.length > maxLines) {
    truncated += `\n... (${lines.length - maxLines} more lines)`;
  }

  return truncated;
};

export const detectDiffContent = (content: string): DiffResult => {
  if (!content) {
    return { isDiff: false, additions: 0, deletions: 0 };
  }

  const cleanContent = stripAnsi(content);

  const isDiff = DIFF_PATTERNS.some((pattern) => pattern.test(cleanContent));

  if (!isDiff) {
    return { isDiff: false, additions: 0, deletions: 0 };
  }

  const fileMatch = cleanContent.match(/\+\+\+\s+[ab]?\/(.+?)(?:\s|$)/m);
  const filePath = fileMatch?.[1]?.trim();

  const lines = cleanContent.split("\n");
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (/^\+[^+]/.test(line) || line === "+") {
      additions++;
    } else if (/^-[^-]/.test(line) || line === "-") {
      deletions++;
    }
  }

  return { isDiff, filePath, additions, deletions };
};

const TOOL_DESCRIPTIONS: Record<
  string,
  (args: Record<string, unknown>) => string
> = {
  bash: (args) => String(args.command || "command"),
  read: (args) => String(args.path || "file"),
  write: (args) => String(args.path || "file"),
  edit: (args) => String(args.path || "file"),
};

export const getToolDescription = (call: {
  name: string;
  arguments?: Record<string, unknown>;
}): string => {
  const args = call.arguments || {};
  const describer = TOOL_DESCRIPTIONS[call.name];
  return describer ? describer(args) : call.name;
};
