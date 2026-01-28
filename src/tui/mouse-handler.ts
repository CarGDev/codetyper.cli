/**
 * Mouse Handler - Intercepts mouse events from stdin before Ink processes them
 *
 * This module intercepts stdin data events to:
 * 1. Enable mouse tracking in the terminal
 * 2. Filter out mouse escape sequences
 * 3. Handle scroll wheel events
 * 4. Pass all other input through to Ink
 */

import type { MouseHandlerCallbacks } from "@interfaces/MouseHandlerCallbacks";
import type { MouseScrollDirection } from "@constants/mouse-handler";
import {
  MOUSE_SCROLL_LINES,
  SGR_MOUSE_REGEX,
  X10_MOUSE_REGEX,
  PARTIAL_SGR_REGEX,
  PARTIAL_X10_REGEX,
  MOUSE_TRACKING_SEQUENCES,
  MOUSE_BUTTON_TO_SCROLL,
} from "@constants/mouse-handler";

// Re-export interface for convenience
export type { MouseHandlerCallbacks } from "@interfaces/MouseHandlerCallbacks";

// Scroll direction handlers type
type ScrollHandlers = Record<MouseScrollDirection, (lines: number) => void>;

/**
 * Enable mouse tracking in the terminal
 */
export const enableMouseTracking = (): void => {
  process.stdout.write(MOUSE_TRACKING_SEQUENCES.ENABLE_BUTTON);
  process.stdout.write(MOUSE_TRACKING_SEQUENCES.ENABLE_SGR);
};

/**
 * Disable mouse tracking in the terminal
 */
export const disableMouseTracking = (): void => {
  process.stdout.write(MOUSE_TRACKING_SEQUENCES.DISABLE_SGR);
  process.stdout.write(MOUSE_TRACKING_SEQUENCES.DISABLE_BUTTON);
};

/**
 * Create scroll handlers from callbacks
 */
const createScrollHandlers = (
  callbacks: MouseHandlerCallbacks,
): ScrollHandlers => ({
  up: callbacks.onScrollUp,
  down: callbacks.onScrollDown,
});

/**
 * Dispatch scroll event to the appropriate handler
 */
const dispatchScrollEvent = (
  direction: MouseScrollDirection,
  handlers: ScrollHandlers,
  lines: number,
): void => {
  handlers[direction](lines);
};

/**
 * Parse SGR mouse events and extract scroll wheel actions
 * Returns the data with mouse sequences removed
 */
const filterMouseEvents = (
  data: string,
  callbacks: MouseHandlerCallbacks,
): string => {
  const handlers = createScrollHandlers(callbacks);

  // Handle SGR mouse sequences
  let filtered = data.replace(
    SGR_MOUSE_REGEX,
    (_match, button, _col, _row, action) => {
      const buttonNum = parseInt(button, 10);
      const direction = MOUSE_BUTTON_TO_SCROLL[buttonNum];

      // Only handle button press events (M), not release (m)
      if (action === "M" && direction) {
        dispatchScrollEvent(direction, handlers, MOUSE_SCROLL_LINES);
      }

      // Remove the sequence
      return "";
    },
  );

  // Remove X10 mouse sequences
  filtered = filtered.replace(X10_MOUSE_REGEX, "");

  // Remove partial/incomplete sequences
  filtered = filtered.replace(PARTIAL_SGR_REGEX, "");
  filtered = filtered.replace(PARTIAL_X10_REGEX, "");

  return filtered;
};

// Store for the original emit function and current callbacks
let originalEmit: typeof process.stdin.emit | null = null;
let currentCallbacks: MouseHandlerCallbacks | null = null;
let isSetup = false;

/**
 * Cleanup function that can be called from anywhere
 */
const doCleanup = (): void => {
  if (!isSetup) return;

  // Disable mouse tracking first (most important for terminal state)
  disableMouseTracking();

  // Restore original emit
  if (originalEmit) {
    process.stdin.emit = originalEmit as typeof process.stdin.emit;
    originalEmit = null;
  }

  currentCallbacks = null;
  isSetup = false;
};

/**
 * Emergency cleanup on process exit - ensures terminal is restored
 */
const emergencyCleanup = (): void => {
  // Just disable mouse tracking - don't try to restore emit
  // This is safe to call multiple times
  process.stdout.write(MOUSE_TRACKING_SEQUENCES.DISABLE_SGR);
  process.stdout.write(MOUSE_TRACKING_SEQUENCES.DISABLE_BUTTON);
};

/**
 * Register process exit handlers for cleanup
 */
const registerExitHandlers = (): void => {
  process.on("exit", emergencyCleanup);
  process.on("SIGINT", () => {
    emergencyCleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    emergencyCleanup();
    process.exit(143);
  });
  process.on("uncaughtException", (err) => {
    emergencyCleanup();
    console.error("Uncaught exception:", err);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    emergencyCleanup();
    console.error("Unhandled rejection:", reason);
    process.exit(1);
  });
};

/**
 * Create data event handler
 */
const createDataHandler = (
  origEmit: typeof process.stdin.emit,
): ((event: string | symbol, ...args: unknown[]) => boolean) => {
  return function (event: string | symbol, ...args: unknown[]): boolean {
    if (event !== "data" || !currentCallbacks || !args[0]) {
      return origEmit.call(process.stdin, event, ...args);
    }

    const chunk = args[0];
    let data: string;

    if (Buffer.isBuffer(chunk)) {
      data = chunk.toString("utf8");
    } else if (typeof chunk === "string") {
      data = chunk;
    } else {
      return origEmit.call(process.stdin, event, ...args);
    }

    // Filter mouse events
    const filtered = filterMouseEvents(data, currentCallbacks);

    // Only emit if there's remaining data
    if (filtered.length > 0) {
      return origEmit.call(process.stdin, event, filtered);
    }

    // Return true to indicate event was handled
    return true;
  };
};

/**
 * Setup mouse handling by intercepting stdin data events
 * This approach preserves raw mode support required by Ink
 */
export const setupMouseHandler = (
  callbacks: MouseHandlerCallbacks,
): {
  cleanup: () => void;
} => {
  if (isSetup) {
    // Already setup, just update callbacks
    currentCallbacks = callbacks;
    return { cleanup: doCleanup };
  }

  currentCallbacks = callbacks;
  isSetup = true;

  // Register exit handlers
  registerExitHandlers();

  // Enable mouse tracking
  enableMouseTracking();

  // Store original emit
  originalEmit = process.stdin.emit.bind(process.stdin);

  // Override emit to intercept 'data' events
  process.stdin.emit = createDataHandler(
    originalEmit,
  ) as typeof process.stdin.emit;

  return {
    cleanup: doCleanup,
  };
};
