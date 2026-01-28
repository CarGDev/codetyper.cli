/**
 * Mouse scroll hook for Ink TUI
 * Enables mouse mode in the terminal and handles scroll wheel events
 */

import { useEffect } from "react";
import { useStdin } from "ink";
import type { MouseScrollOptions } from "@interfaces/MouseScrollOptions";
import type { ScrollDirection } from "@constants/mouse-scroll";
import {
  MOUSE_ESCAPE_SEQUENCES,
  MOUSE_BUTTON_TO_DIRECTION,
  SGR_MOUSE_PATTERN,
  X10_MOUSE_PREFIX,
  X10_MIN_LENGTH,
  X10_BUTTON_OFFSET,
} from "@constants/mouse-scroll";

type ScrollHandlers = {
  up: () => void;
  down: () => void;
};

/**
 * Parse SGR mouse mode format and return scroll direction
 * Format: \x1b[<button;x;yM or \x1b[<button;x;ym
 */
const parseSgrMouseEvent = (data: string): ScrollDirection | null => {
  const match = data.match(SGR_MOUSE_PATTERN);
  if (!match) return null;

  const button = parseInt(match[1], 10);
  return MOUSE_BUTTON_TO_DIRECTION[button] ?? null;
};

/**
 * Parse X10/Normal mouse mode format and return scroll direction
 * Format: \x1b[M followed by 3 bytes (button at offset 3)
 */
const parseX10MouseEvent = (data: string): ScrollDirection | null => {
  const isX10Format =
    data.startsWith(X10_MOUSE_PREFIX) && data.length >= X10_MIN_LENGTH;

  if (!isX10Format) return null;

  const button = data.charCodeAt(X10_BUTTON_OFFSET);
  return MOUSE_BUTTON_TO_DIRECTION[button] ?? null;
};

/**
 * Parse mouse event data and return scroll direction
 */
const parseMouseEvent = (data: string): ScrollDirection | null => {
  // Try SGR format first, then X10 format
  return parseSgrMouseEvent(data) ?? parseX10MouseEvent(data);
};

/**
 * Create scroll handler that dispatches to the appropriate callback
 */
const createScrollDispatcher = (handlers: ScrollHandlers) => {
  return (direction: ScrollDirection): void => {
    handlers[direction]();
  };
};

/**
 * Hook to enable mouse scroll support in the terminal
 *
 * @param options - Scroll handlers and enabled flag
 */
export const useMouseScroll = ({
  onScrollUp,
  onScrollDown,
  enabled = true,
}: MouseScrollOptions): void => {
  const { stdin } = useStdin();

  useEffect(() => {
    if (!enabled || !stdin) return;

    // Enable mouse mode
    process.stdout.write(MOUSE_ESCAPE_SEQUENCES.ENABLE);

    const handlers: ScrollHandlers = {
      up: onScrollUp,
      down: onScrollDown,
    };

    const dispatchScroll = createScrollDispatcher(handlers);

    const handleData = (data: Buffer): void => {
      const str = data.toString();
      const direction = parseMouseEvent(str);

      if (direction) {
        dispatchScroll(direction);
      }
    };

    stdin.on("data", handleData);

    return () => {
      // Disable mouse mode on cleanup
      process.stdout.write(MOUSE_ESCAPE_SEQUENCES.DISABLE);
      stdin.off("data", handleData);
    };
  }, [enabled, stdin, onScrollUp, onScrollDown]);
};
