/**
 * Auto-Scroll Hook
 *
 * Manages auto-scroll behavior for the log panel, inspired by opencode's implementation.
 * Features:
 * - Automatic scroll to bottom when content is being generated
 * - User scroll detection (scrolling up pauses auto-scroll)
 * - Resume auto-scroll when user scrolls back to bottom
 * - Settling period after operations complete
 * - Distinguishes between user-initiated and programmatic scrolls
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  AutoScrollOptions,
  AutoScrollReturn,
} from "@interfaces/AutoScrollOptions";
import {
  BOTTOM_THRESHOLD,
  SETTLE_TIMEOUT_MS,
  AUTO_SCROLL_MARK_TIMEOUT_MS,
  KEYBOARD_SCROLL_LINES,
} from "@constants/auto-scroll";

interface AutoMark {
  offset: number;
  time: number;
}

export const useAutoScroll = ({
  isWorking,
  totalLines,
  visibleHeight,
  onUserInteracted,
  bottomThreshold = BOTTOM_THRESHOLD,
}: AutoScrollOptions): AutoScrollReturn => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  // Refs for timers and auto-mark tracking
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoMarkRef = useRef<AutoMark | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevWorkingRef = useRef(false);
  const prevTotalLinesRef = useRef(totalLines);

  // Calculate max scroll offset
  const maxScroll = Math.max(0, totalLines - visibleHeight);

  // Check if currently active (working or settling)
  const isActive = isWorking() || isSettling;

  /**
   * Mark a scroll as programmatic (auto-scroll)
   * This helps distinguish auto-scrolls from user scrolls in async scenarios
   */
  const markAuto = useCallback((offset: number) => {
    autoMarkRef.current = {
      offset,
      time: Date.now(),
    };

    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
    }

    autoTimerRef.current = setTimeout(() => {
      autoMarkRef.current = null;
      autoTimerRef.current = null;
    }, AUTO_SCROLL_MARK_TIMEOUT_MS);
  }, []);

  /**
   * Calculate distance from bottom
   */
  const distanceFromBottom = useCallback(
    (offset: number): number => {
      return maxScroll - offset;
    },
    [maxScroll],
  );

  /**
   * Check if we can scroll (content exceeds viewport)
   */
  const canScroll = useCallback((): boolean => {
    return totalLines > visibleHeight;
  }, [totalLines, visibleHeight]);

  /**
   * Scroll to bottom programmatically
   */
  const scrollToBottomInternal = useCallback(
    (force: boolean) => {
      if (!force && !isActive) return;
      if (!force && userScrolled) return;

      if (force && userScrolled) {
        setUserScrolled(false);
      }

      const distance = distanceFromBottom(scrollOffset);
      if (distance < 2) return;

      // Mark as auto-scroll and update offset
      markAuto(maxScroll);
      setScrollOffset(maxScroll);
      setAutoScroll(true);
    },
    [
      isActive,
      userScrolled,
      distanceFromBottom,
      scrollOffset,
      markAuto,
      maxScroll,
    ],
  );

  /**
   * Pause auto-scroll (user scrolled up)
   */
  const pause = useCallback(() => {
    if (!canScroll()) {
      if (userScrolled) setUserScrolled(false);
      return;
    }
    if (userScrolled) return;

    setUserScrolled(true);
    setAutoScroll(false);
    onUserInteracted?.();
  }, [canScroll, userScrolled, onUserInteracted]);

  /**
   * Resume auto-scroll mode
   */
  const resume = useCallback(() => {
    if (userScrolled) {
      setUserScrolled(false);
    }
    scrollToBottomInternal(true);
  }, [userScrolled, scrollToBottomInternal]);

  /**
   * User-initiated scroll up
   */
  const scrollUp = useCallback(
    (lines: number = KEYBOARD_SCROLL_LINES) => {
      const newOffset = Math.max(0, scrollOffset - lines);
      setScrollOffset(newOffset);

      // User scrolling up always pauses auto-scroll
      pause();
    },
    [scrollOffset, pause],
  );

  /**
   * User-initiated scroll down
   */
  const scrollDown = useCallback(
    (lines: number = KEYBOARD_SCROLL_LINES) => {
      const newOffset = Math.min(maxScroll, scrollOffset + lines);
      setScrollOffset(newOffset);

      // Check if user scrolled back to bottom
      if (distanceFromBottom(newOffset) <= bottomThreshold) {
        setUserScrolled(false);
        setAutoScroll(true);
      }
    },
    [scrollOffset, maxScroll, distanceFromBottom, bottomThreshold],
  );

  /**
   * Scroll to top (user-initiated)
   */
  const scrollToTop = useCallback(() => {
    setScrollOffset(0);
    pause();
  }, [pause]);

  /**
   * Scroll to bottom and resume auto-scroll
   */
  const scrollToBottom = useCallback(() => {
    resume();
  }, [resume]);

  /**
   * Get effective scroll offset (clamped)
   */
  const getEffectiveOffset = useCallback((): number => {
    if (autoScroll && !userScrolled) {
      return maxScroll;
    }
    return Math.min(scrollOffset, maxScroll);
  }, [autoScroll, userScrolled, scrollOffset, maxScroll]);

  /**
   * Check if can scroll up
   */
  const canScrollUp = useCallback((): boolean => {
    return getEffectiveOffset() > 0;
  }, [getEffectiveOffset]);

  /**
   * Check if can scroll down
   */
  const canScrollDown = useCallback((): boolean => {
    return getEffectiveOffset() < maxScroll;
  }, [getEffectiveOffset, maxScroll]);

  // Handle working state changes (settling period)
  useEffect(() => {
    const working = isWorking();

    if (working !== prevWorkingRef.current) {
      prevWorkingRef.current = working;

      // Clear existing settle timer
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }

      if (working) {
        // Starting work - scroll to bottom if not user-scrolled
        setIsSettling(false);
        if (!userScrolled) {
          scrollToBottomInternal(true);
        }
      } else {
        // Finished work - enter settling period
        setIsSettling(true);
        settleTimerRef.current = setTimeout(() => {
          setIsSettling(false);
          settleTimerRef.current = null;
        }, SETTLE_TIMEOUT_MS);
      }
    }
  }, [isWorking, userScrolled, scrollToBottomInternal]);

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (totalLines > prevTotalLinesRef.current) {
      // New content added
      if (autoScroll && !userScrolled) {
        markAuto(maxScroll);
        setScrollOffset(maxScroll);
      }
    }
    prevTotalLinesRef.current = totalLines;
  }, [totalLines, autoScroll, userScrolled, maxScroll, markAuto]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
      }
    };
  }, []);

  return {
    scrollOffset,
    autoScroll,
    userScrolled,
    isSettling,
    scrollUp,
    scrollDown,
    scrollToTop,
    scrollToBottom,
    resume,
    pause,
    getEffectiveOffset,
    canScrollUp,
    canScrollDown,
  };
};
