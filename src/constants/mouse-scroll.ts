/**
 * Mouse Scroll Constants
 *
 * Terminal escape sequences for mouse mode handling
 */

// Mouse mode enable/disable escape sequences
export const MOUSE_ESCAPE_SEQUENCES = {
  ENABLE: "\x1b[?1000h\x1b[?1002h\x1b[?1015h\x1b[?1006h",
  DISABLE: "\x1b[?1006l\x1b[?1015l\x1b[?1002l\x1b[?1000l",
} as const;

// Mouse button codes
export const MOUSE_BUTTON_CODES = {
  SGR_SCROLL_UP: 64,
  SGR_SCROLL_DOWN: 65,
  X10_SCROLL_UP: 96, // 32 + 64
  X10_SCROLL_DOWN: 97, // 32 + 65
} as const;

// SGR mouse mode regex pattern
export const SGR_MOUSE_PATTERN = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/;

// X10/Normal mouse mode prefix
export const X10_MOUSE_PREFIX = "\x1b[M";
export const X10_MIN_LENGTH = 6;
export const X10_BUTTON_OFFSET = 3;

// Scroll direction type
export type ScrollDirection = "up" | "down";

// Mouse button to scroll direction mapping
export const MOUSE_BUTTON_TO_DIRECTION: Record<number, ScrollDirection> = {
  [MOUSE_BUTTON_CODES.SGR_SCROLL_UP]: "up",
  [MOUSE_BUTTON_CODES.SGR_SCROLL_DOWN]: "down",
  [MOUSE_BUTTON_CODES.X10_SCROLL_UP]: "up",
  [MOUSE_BUTTON_CODES.X10_SCROLL_DOWN]: "down",
} as const;
