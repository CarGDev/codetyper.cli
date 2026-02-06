/**
 * ANSI Escape Code Utilities
 *
 * Functions for handling ANSI escape codes in terminal output.
 */

/**
 * Regex to match ANSI escape sequences
 */
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g;

/**
 * Strip all ANSI escape codes from a string
 */
export const stripAnsi = (text: string): string => {
  return text.replace(ANSI_REGEX, "");
};

/**
 * Check if a string contains ANSI escape codes
 */
export const hasAnsi = (text: string): boolean => {
  return ANSI_REGEX.test(text);
};

/**
 * Truncate text to a maximum number of lines
 */
export const truncateLines = (
  text: string,
  maxLines: number,
  showCount = true,
): { text: string; truncated: boolean; hiddenCount: number } => {
  const lines = text.split("\n");

  if (lines.length <= maxLines) {
    return { text, truncated: false, hiddenCount: 0 };
  }

  const visibleLines = lines.slice(0, maxLines);
  const hiddenCount = lines.length - maxLines;

  const suffix = showCount ? `\n... (${hiddenCount} more lines)` : "";

  return {
    text: visibleLines.join("\n") + suffix,
    truncated: true,
    hiddenCount,
  };
};

/**
 * Format a tool name with optional truncated args for display
 * Like: Bash(git add -A && git commit...)
 */
export const formatToolCall = (
  toolName: string,
  args?: Record<string, unknown>,
  maxLength = 60,
): string => {
  if (!args) {
    return toolName;
  }

  // Get the main argument (command, file_path, filePath, query, etc.)
  const mainArg =
    args.command ??
    args.file_path ??
    args.filePath ??
    args.query ??
    args.pattern ??
    args.url;

  if (!mainArg || typeof mainArg !== "string") {
    return toolName;
  }

  // Clean and truncate the argument
  const cleanArg = stripAnsi(mainArg).replace(/\n/g, " ").trim();
  const truncatedArg =
    cleanArg.length > maxLength
      ? cleanArg.substring(0, maxLength) + "..."
      : cleanArg;

  return `${toolName}(${truncatedArg})`;
};

/**
 * Format a file operation tool name
 * Like: Write(src/utils/ansi.ts), Edit(package.json), Read(1 file)
 */
export const formatFileToolCall = (
  toolName: string,
  filePath?: string,
  fileCount?: number,
): string => {
  if (fileCount && fileCount > 1) {
    return `${toolName}(${fileCount} files)`;
  }

  if (filePath) {
    // Just show the filename or last path segment
    const filename = filePath.split("/").pop() || filePath;
    return `${toolName}(${filename})`;
  }

  return toolName;
};
