/**
 * Mouse tracking disable sequence (all modes)
 */
export const DISABLE_MOUSE_TRACKING =
  "\x1b[?1006l" + // SGR Mouse Mode
  "\x1b[?1015l" + // urxvt Mouse Mode
  "\x1b[?1003l" + // All mouse events (motion)
  "\x1b[?1002l" + // Button event mouse tracking
  "\x1b[?1000l"; // Normal tracking mode
