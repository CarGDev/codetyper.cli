/**
 * Auto-Scroll Constants
 *
 * Constants for auto-scroll behavior in the TUI
 */

/** Distance from bottom (in lines) to consider "at bottom" */
export const BOTTOM_THRESHOLD = 3;

/** Settling time after operations complete (ms) */
export const SETTLE_TIMEOUT_MS = 300;

/** Timeout for marking auto-scroll events (ms) */
export const AUTO_SCROLL_MARK_TIMEOUT_MS = 250;

/** Default scroll lines per keyboard event */
export const KEYBOARD_SCROLL_LINES = 3;

/** Default scroll lines per page event */
export const PAGE_SCROLL_LINES = 10;

/** Mouse scroll lines per wheel event */
export const MOUSE_SCROLL_LINES = 3;
