/**
 * Mouse Handler Constants
 *
 * Constants for terminal mouse event handling
 */

// Mouse event button codes for SGR encoding
export const MOUSE_WHEEL_CODES = {
  UP: 64,
  DOWN: 65,
} as const;

// Default scroll lines per wheel event
export const MOUSE_SCROLL_LINES = 3;

// SGR mouse sequence pattern: \x1b[<Cb;Cx;Cy(M|m)
export const SGR_MOUSE_REGEX = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

// X10 mouse sequence pattern: \x1b[M followed by 3 bytes
export const X10_MOUSE_REGEX = /\x1b\[M[\x20-\xff]{3}/g;

// Partial/incomplete sequence patterns for cleanup
export const PARTIAL_SGR_REGEX = /\x1b\[<[\d;]*$/;
export const PARTIAL_X10_REGEX = /\x1b\[M.{0,2}$/;

// Mouse tracking escape sequences
export const MOUSE_TRACKING_SEQUENCES = {
  ENABLE_BUTTON: "\x1b[?1000h",
  ENABLE_SGR: "\x1b[?1006h",
  DISABLE_SGR: "\x1b[?1006l",
  DISABLE_BUTTON: "\x1b[?1000l",
} as const;

// Scroll direction type
export type MouseScrollDirection = "up" | "down";

// Button code to scroll direction mapping
export const MOUSE_BUTTON_TO_SCROLL: Record<number, MouseScrollDirection> = {
  [MOUSE_WHEEL_CODES.UP]: "up",
  [MOUSE_WHEEL_CODES.DOWN]: "down",
} as const;
