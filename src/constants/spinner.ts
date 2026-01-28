/**
 * Spinner animation constants
 */

// Spinner frame sets
export const Spinners = {
  dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  line: ["-", "\\", "|", "/"],
  circle: ["◐", "◓", "◑", "◒"],
  arrow: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
  bounce: ["⠁", "⠂", "⠄", "⠂"],
  bars: [
    "▏",
    "▎",
    "▍",
    "▌",
    "▋",
    "▊",
    "▉",
    "█",
    "▉",
    "▊",
    "▋",
    "▌",
    "▍",
    "▎",
    "▏",
  ],
  pulse: ["█", "▓", "▒", "░", "▒", "▓"],
  blocks: ["▖", "▘", "▝", "▗"],
  clock: [
    "🕐",
    "🕑",
    "🕒",
    "🕓",
    "🕔",
    "🕕",
    "🕖",
    "🕗",
    "🕘",
    "🕙",
    "🕚",
    "🕛",
  ],
  moon: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  braille: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  scanner: [
    "[    ]",
    "[=   ]",
    "[==  ]",
    "[=== ]",
    "[ ===]",
    "[  ==]",
    "[   =]",
    "[    ]",
  ],
} as const;

// Default spinner configuration
export const SPINNER_DEFAULTS = {
  type: "dots" as const,
  interval: 80,
  text: "Loading...",
} as const;

// Scanner spinner defaults
export const SCANNER_DEFAULTS = {
  width: 10,
  interval: 60,
  char: "█",
} as const;

// Progress bar defaults
export const PROGRESS_BAR_DEFAULTS = {
  width: 30,
  filledChar: "█",
  emptyChar: "░",
} as const;
