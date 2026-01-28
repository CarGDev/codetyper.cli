/**
 * Auto-Scroll Options Interface
 *
 * Configuration for auto-scroll behavior
 */

export interface AutoScrollOptions {
  /** Function that returns whether content is actively being generated */
  isWorking: () => boolean;

  /** Total content height in lines */
  totalLines: number;

  /** Visible viewport height in lines */
  visibleHeight: number;

  /** Callback when user interrupts auto-scroll by scrolling up */
  onUserInteracted?: () => void;

  /** Distance from bottom (in lines) to consider "at bottom" */
  bottomThreshold?: number;
}

export interface AutoScrollState {
  /** Current scroll offset in lines */
  scrollOffset: number;

  /** Whether auto-scroll to bottom is enabled */
  autoScroll: boolean;

  /** Whether the user has manually scrolled (pausing auto-scroll) */
  userScrolled: boolean;

  /** Whether we're in the settling period after operations complete */
  isSettling: boolean;
}

export interface AutoScrollActions {
  /** Scroll up by specified lines (user-initiated) */
  scrollUp: (lines?: number) => void;

  /** Scroll down by specified lines (user-initiated) */
  scrollDown: (lines?: number) => void;

  /** Scroll to the top (user-initiated) */
  scrollToTop: () => void;

  /** Scroll to the bottom and resume auto-scroll */
  scrollToBottom: () => void;

  /** Resume auto-scroll mode */
  resume: () => void;

  /** Pause auto-scroll (called when user scrolls up) */
  pause: () => void;

  /** Get the effective scroll offset (clamped to valid range) */
  getEffectiveOffset: () => number;

  /** Check if can scroll up */
  canScrollUp: () => boolean;

  /** Check if can scroll down */
  canScrollDown: () => boolean;
}

export type AutoScrollReturn = AutoScrollState & AutoScrollActions;
