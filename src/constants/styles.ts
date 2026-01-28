/**
 * ANSI color styles constants for terminal output
 */

// ANSI escape codes
export const Style = {
  // Reset
  RESET: "\x1b[0m",

  // Text styles
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
  ITALIC: "\x1b[3m",
  UNDERLINE: "\x1b[4m",

  // Colors
  BLACK: "\x1b[30m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",
  GRAY: "\x1b[90m",

  // Bright colors
  BRIGHT_RED: "\x1b[91m",
  BRIGHT_GREEN: "\x1b[92m",
  BRIGHT_YELLOW: "\x1b[93m",
  BRIGHT_BLUE: "\x1b[94m",
  BRIGHT_MAGENTA: "\x1b[95m",
  BRIGHT_CYAN: "\x1b[96m",
  BRIGHT_WHITE: "\x1b[97m",

  // Background colors
  BG_BLACK: "\x1b[40m",
  BG_RED: "\x1b[41m",
  BG_GREEN: "\x1b[42m",
  BG_YELLOW: "\x1b[43m",
  BG_BLUE: "\x1b[44m",
  BG_MAGENTA: "\x1b[45m",
  BG_CYAN: "\x1b[46m",
  BG_WHITE: "\x1b[47m",
} as const;

// Semantic colors
export const Theme = {
  primary: Style.BRIGHT_CYAN,
  secondary: Style.BRIGHT_MAGENTA,
  accent: Style.BRIGHT_BLUE,
  success: Style.BRIGHT_GREEN,
  warning: Style.BRIGHT_YELLOW,
  error: Style.BRIGHT_RED,
  info: Style.BRIGHT_BLUE,
  text: Style.WHITE,
  textMuted: Style.GRAY,
  textDim: Style.DIM,
} as const;

// Icons
export const Icons = {
  // Status
  success: "\u2714", // ✔
  error: "\u2718", // ✘
  warning: "\u26A0", // ⚠
  info: "\u2139", // ℹ
  pending: "\u25CB", // ○
  running: "\u25CF", // ●

  // Actions
  arrow: "\u2192", // →
  arrowLeft: "\u2190", // ←
  arrowUp: "\u2191", // ↑
  arrowDown: "\u2193", // ↓

  // Tools
  bash: "$",
  read: "\u2192", // →
  write: "\u2190", // ←
  edit: "\u270E", // ✎
  search: "\u2731", // ✱

  // Misc
  bullet: "\u2022", // •
  dot: "\u00B7", // ·
  star: "\u2605", // ★
  sparkle: "\u2728", // ✨
  lightning: "\u26A1", // ⚡
  gear: "\u2699", // ⚙
  key: "\u1F511", // 🔑
  lock: "\u1F512", // 🔒
  folder: "\u1F4C1", // 📁
  file: "\u1F4C4", // 📄
} as const;
