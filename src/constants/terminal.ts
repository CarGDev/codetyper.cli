/**
 * Mouse tracking disable sequence (all modes)
 */
export const DISABLE_MOUSE_TRACKING =
  "\x1b[?1006l" + // SGR Mouse Mode
  "\x1b[?1015l" + // urxvt Mouse Mode
  "\x1b[?1003l" + // All mouse events (motion)
  "\x1b[?1002l" + // Button event mouse tracking
  "\x1b[?1000l"; // Normal tracking mode

/**
 * Full terminal reset sequence for cleanup on exit
 * Disables all tracking modes, restores cursor, exits alternate screen
 */
export const TERMINAL_RESET =
  DISABLE_MOUSE_TRACKING +
  "\x1b[?25h" + // Show cursor
  "\x1b[?1049l" + // Leave alternate screen
  "\x1b[>4;0m" + // Disable Kitty keyboard protocol (pop)
  "\x1b[?2004l"; // Disable bracketed paste mode
