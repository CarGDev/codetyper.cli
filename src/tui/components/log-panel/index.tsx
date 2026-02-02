/**
 * Log Panel Component - Displays conversation history and tool execution
 * Supports scrolling with Page Up/Down, mouse wheel, and auto-scroll on new messages
 *
 * Features:
 * - Auto-scroll to bottom when new content arrives (during active operations)
 * - User scroll detection (scrolling up pauses auto-scroll)
 * - Resume auto-scroll when user scrolls back to bottom
 * - Virtual scrolling for performance
 * - Shows logo and welcome screen when no logs
 */

import React, { useEffect, useRef, useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import { useAppStore } from "@tui/store";
import {
  LOG_PANEL_RESERVED_HEIGHT,
  LOG_PANEL_MIN_HEIGHT,
  LOG_PANEL_DEFAULT_TERMINAL_HEIGHT,
} from "@constants/tui-components";
import { LogEntryDisplay } from "@tui/components/log-panel/entry-renderers";
import { ThinkingIndicator } from "@tui/components/log-panel/thinking-indicator";
import { estimateEntryLines } from "@tui/components/log-panel/utils";
import { Logo } from "@tui/components/home/Logo";

export function LogPanel(): React.ReactElement {
  const allLogs = useAppStore((state) => state.logs);
  const thinkingMessage = useAppStore((state) => state.thinkingMessage);
  const mode = useAppStore((state) => state.mode);
  const autoScroll = useAppStore((state) => state.autoScroll);
  const userScrolled = useAppStore((state) => state.userScrolled);
  const setScrollDimensions = useAppStore((state) => state.setScrollDimensions);
  const getEffectiveScrollOffset = useAppStore(
    (state) => state.getEffectiveScrollOffset,
  );
  const { stdout } = useStdout();

  // Filter out quiet tool entries (read-only operations like file reads, ls, etc.)
  const logs = useMemo(() => {
    return allLogs.filter((entry) => {
      // Always show non-tool entries
      if (entry.type !== "tool") return true;
      // Hide quiet operations
      if (entry.metadata?.quiet) return false;
      return true;
    });
  }, [allLogs]);

  // Get terminal height (subtract space for header, status bar, input, borders)
  const terminalHeight = stdout?.rows ?? LOG_PANEL_DEFAULT_TERMINAL_HEIGHT;
  const visibleHeight = Math.max(
    LOG_PANEL_MIN_HEIGHT,
    terminalHeight - LOG_PANEL_RESERVED_HEIGHT,
  );

  // Calculate total content height
  const totalLines = useMemo(() => {
    return logs.reduce((sum, entry) => sum + estimateEntryLines(entry), 0);
  }, [logs]);

  // Track previous values for change detection
  const prevLogCountRef = useRef(logs.length);
  const prevTotalLinesRef = useRef(totalLines);

  // Update scroll dimensions when content or viewport changes
  useEffect(() => {
    setScrollDimensions(totalLines, visibleHeight);
  }, [totalLines, visibleHeight, setScrollDimensions]);

  // Auto-scroll to bottom when new logs arrive (only if auto-scroll is enabled)
  useEffect(() => {
    const logsChanged = logs.length !== prevLogCountRef.current;
    const contentGrew = totalLines > prevTotalLinesRef.current;

    if ((logsChanged || contentGrew) && autoScroll && !userScrolled) {
      // New content added and auto-scroll is active, update dimensions to scroll to bottom
      setScrollDimensions(totalLines, visibleHeight);
    }

    prevLogCountRef.current = logs.length;
    prevTotalLinesRef.current = totalLines;
  }, [
    logs.length,
    totalLines,
    autoScroll,
    userScrolled,
    visibleHeight,
    setScrollDimensions,
  ]);

  // Calculate effective scroll offset
  const maxScroll = Math.max(0, totalLines - visibleHeight);
  const effectiveOffset = getEffectiveScrollOffset();

  // Calculate which entries to show based on scroll position
  const { visibleEntries } = useMemo(() => {
    let currentLine = 0;
    let startIdx = 0;
    let endIdx = logs.length;
    let skipLines = 0;

    // Find start index
    for (let i = 0; i < logs.length; i++) {
      const entryLines = estimateEntryLines(logs[i]);
      if (currentLine + entryLines > effectiveOffset) {
        startIdx = i;
        skipLines = effectiveOffset - currentLine;
        break;
      }
      currentLine += entryLines;
    }

    // Find end index
    currentLine = 0;
    for (let i = startIdx; i < logs.length; i++) {
      const entryLines = estimateEntryLines(logs[i]);
      currentLine += entryLines;
      if (currentLine >= visibleHeight + (i === startIdx ? skipLines : 0)) {
        endIdx = i + 1;
        break;
      }
    }

    return {
      visibleEntries: logs.slice(startIdx, endIdx),
      startOffset: skipLines,
    };
  }, [logs, effectiveOffset, visibleHeight]);

  // Show scroll indicators
  const canScrollUp = effectiveOffset > 0;
  const canScrollDown = effectiveOffset < maxScroll;

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      paddingX={1}
      borderStyle="single"
      borderColor="gray"
      overflow="hidden"
    >
      {/* Scroll up indicator */}
      {canScrollUp && (
        <Box justifyContent="center">
          <Text dimColor>
            ▲ {userScrolled ? "Auto-scroll paused • " : ""}Scroll: Shift+↑ |
            PageUp | Mouse
          </Text>
        </Box>
      )}

      {logs.length === 0 && !thinkingMessage ? (
        <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center">
          <Logo />
          <Box marginTop={1}>
            <Text dimColor>AI Coding Assistant</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Type your prompt below • Ctrl+M to switch modes</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1}>
          {visibleEntries.map((entry) => (
            <LogEntryDisplay key={entry.id} entry={entry} />
          ))}

          {mode === "thinking" && thinkingMessage && (
            <ThinkingIndicator message={thinkingMessage} />
          )}
        </Box>
      )}

      {/* Scroll down indicator */}
      {canScrollDown && (
        <Box justifyContent="center">
          <Text dimColor>
            ▼ Scroll: Shift+↓ | PageDown | Mouse
            {userScrolled ? " • Ctrl+End to resume" : ""}
          </Text>
        </Box>
      )}
    </Box>
  );
}
