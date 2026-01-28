/**
 * Text manipulation utilities
 */

/**
 * Get terminal width
 */
export const getTerminalWidth = (): number => process.stdout.columns || 80;

/**
 * Repeat a character to fill width
 */
export const repeat = (char: string, count: number): string =>
  char.repeat(Math.max(0, count));

/**
 * Create a horizontal line
 */
export const line = (char = "─", width?: number): string =>
  repeat(char, width || getTerminalWidth());

/**
 * Strip ANSI codes from string (for measuring length)
 */
export const stripAnsi = (text: string): string =>
  // eslint-disable-next-line no-control-regex
  text.replace(/\x1b\[[0-9;]*m/g, "");

/**
 * Center text in terminal
 */
export const center = (text: string, width?: number): string => {
  const w = width || getTerminalWidth();
  const textLength = stripAnsi(text).length;
  const padding = Math.max(0, Math.floor((w - textLength) / 2));
  return repeat(" ", padding) + text;
};

/**
 * Truncate text to max length with ellipsis
 */
export const truncate = (
  text: string,
  maxLength: number,
  suffix = "...",
): string => {
  const stripped = stripAnsi(text);
  if (stripped.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Wrap text to specified width
 */
export const wrap = (
  text: string,
  width: number = getTerminalWidth(),
): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    if (stripAnsi(testLine).length > width) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
};
