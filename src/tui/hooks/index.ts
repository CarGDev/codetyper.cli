/**
 * TUI Hooks exports
 */

export { useMouseScroll } from "@tui/hooks/useMouseScroll";
export { useAutoScroll } from "@tui/hooks/useAutoScroll";

// Re-export types for convenience
export type { MouseScrollOptions } from "@interfaces/MouseScrollOptions";
export type { ScrollDirection } from "@constants/mouse-scroll";
export type {
  AutoScrollOptions,
  AutoScrollState,
  AutoScrollActions,
  AutoScrollReturn,
} from "@interfaces/AutoScrollOptions";
