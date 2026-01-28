/**
 * Input editor constants
 */

// Default prompts
export const INPUT_EDITOR_DEFAULTS = {
  prompt: "\x1b[36m> \x1b[0m",
  continuationPrompt: "\x1b[90m│ \x1b[0m",
} as const;

// ANSI escape sequences
export const ANSI = {
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  clearLine: "\x1b[2K",
  moveUp: (n: number) => `\x1b[${n}A`,
  moveDown: (n: number) => `\x1b[${n}B`,
  moveRight: (n: number) => `\x1b[${n}C`,
  carriageReturn: "\r",
} as const;

// Special key sequences for Alt+Enter
export const ALT_ENTER_SEQUENCES = ["\x1b\r", "\x1b\n"] as const;

// Pasted text styling
export const PASTE_STYLE = {
  // Gray/dim style for pasted text placeholder
  start: "\x1b[90m",
  end: "\x1b[0m",
} as const;
