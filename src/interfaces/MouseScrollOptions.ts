/**
 * Mouse Scroll Options Interface
 *
 * Configuration options for the useMouseScroll hook
 */

export interface MouseScrollOptions {
  /** Callback fired when scrolling up */
  onScrollUp: () => void;
  /** Callback fired when scrolling down */
  onScrollDown: () => void;
  /** Whether mouse scroll is enabled (default: true) */
  enabled?: boolean;
}
