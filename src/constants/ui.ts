/**
 * UI Constants
 */

// Keyboard hints displayed in status bar
export const STATUS_HINTS = {
  INTERRUPT: "ctrl+c to interrupt",
  INTERRUPT_CONFIRM: "ctrl+c again to confirm",
  TOGGLE_TODOS: "ctrl+t to hide todos",
  TOGGLE_TODOS_SHOW: "ctrl+t to show todos",
} as const;

// Time formatting
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
} as const;

// Token display formatting
export const TOKEN_DISPLAY = {
  K_THRESHOLD: 1000,
  DECIMALS: 1,
} as const;

// Status bar separator
export const STATUS_SEPARATOR = " · ";

// Interrupt timeout (ms) - time before interrupt pending resets
export const INTERRUPT_TIMEOUT = 2000;

// Terminal escape sequences for fullscreen mode
export const TERMINAL_SEQUENCES = {
  ENTER_ALTERNATE_SCREEN: "\x1b[?1049h",
  LEAVE_ALTERNATE_SCREEN: "\x1b[?1049l",
  CLEAR_SCREEN: "\x1b[2J",
  CLEAR_SCROLLBACK: "\x1b[3J",
  CURSOR_HOME: "\x1b[H",
  HIDE_CURSOR: "\x1b[?25l",
  SHOW_CURSOR: "\x1b[?25h",
} as const;
