/**
 * Status Bar Component - Shows session stats, keyboard hints, and current mode
 */

import React, { useEffect, useState, useRef } from "react";
import { Box, Text } from "ink";
import { useAppStore } from "@tui/store";
import {
  STATUS_HINTS,
  STATUS_SEPARATOR,
  TIME_UNITS,
  TOKEN_DISPLAY,
} from "@constants/ui";
import { getThinkingMessage, getToolMessage } from "@constants/status-messages";
import {
  MODE_DISPLAY_CONFIG,
  DEFAULT_MODE_DISPLAY,
  type ModeDisplayConfig,
} from "@constants/tui-components";
import type { AppMode, ToolCall } from "@/types/tui";
import { useTodoStore } from "@tui/hooks/useTodoStore";

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / TIME_UNITS.SECOND);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const formatTokens = (count: number): string => {
  if (count >= TOKEN_DISPLAY.K_THRESHOLD) {
    return `${(count / TOKEN_DISPLAY.K_THRESHOLD).toFixed(TOKEN_DISPLAY.DECIMALS)}k`;
  }
  return String(count);
};

const getModeDisplay = (
  mode: AppMode,
  statusMessage: string,
  currentToolCall: ToolCall | null,
): ModeDisplayConfig => {
  const baseConfig = MODE_DISPLAY_CONFIG[mode] ?? DEFAULT_MODE_DISPLAY;

  // Override text for dynamic modes
  if (mode === "thinking" && statusMessage) {
    return { ...baseConfig, text: statusMessage };
  }

  if (mode === "tool_execution") {
    const toolText =
      statusMessage || `✻ Running ${currentToolCall?.name || "tool"}…`;
    return { ...baseConfig, text: toolText };
  }

  return baseConfig;
};

export function StatusBar(): React.ReactElement {
  const mode = useAppStore((state) => state.mode);
  const currentToolCall = useAppStore((state) => state.currentToolCall);
  const sessionStats = useAppStore((state) => state.sessionStats);
  const todosVisible = useAppStore((state) => state.todosVisible);
  const interruptPending = useAppStore((state) => state.interruptPending);
  const hasPlan = useTodoStore((state) => state.currentPlan !== null);

  // Elapsed time tracking with re-render every second
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - sessionStats.startTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStats.startTime]);

  // Calculate thinking time - only update once per second to reduce re-renders
  const [thinkingTime, setThinkingTime] = useState(0);
  useEffect(() => {
    if (sessionStats.thinkingStartTime === null) {
      setThinkingTime(0);
      return;
    }
    // Update immediately
    setThinkingTime(
      Math.floor((Date.now() - sessionStats.thinkingStartTime) / 1000),
    );
    // Then update every second (not 100ms to reduce re-renders)
    const timer = setInterval(() => {
      setThinkingTime(
        Math.floor((Date.now() - sessionStats.thinkingStartTime!) / 1000),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStats.thinkingStartTime]);

  // Rotating whimsical status message
  const [statusMessage, setStatusMessage] = useState("");
  const prevModeRef = useRef(mode);
  const prevToolRef = useRef(currentToolCall?.name);

  useEffect(() => {
    const isProcessing = mode === "thinking" || mode === "tool_execution";

    if (!isProcessing) {
      setStatusMessage("");
      return;
    }

    // Generate new message when mode or tool changes
    const modeChanged = prevModeRef.current !== mode;
    const toolChanged = prevToolRef.current !== currentToolCall?.name;

    if (modeChanged || toolChanged) {
      if (mode === "thinking") {
        setStatusMessage(getThinkingMessage());
      } else if (mode === "tool_execution" && currentToolCall) {
        setStatusMessage(
          getToolMessage(currentToolCall.name, currentToolCall.description),
        );
      }
    }

    prevModeRef.current = mode;
    prevToolRef.current = currentToolCall?.name;

    // Rotate message every 2.5 seconds during processing
    const timer = setInterval(() => {
      if (mode === "thinking") {
        setStatusMessage(getThinkingMessage());
      } else if (mode === "tool_execution" && currentToolCall) {
        setStatusMessage(
          getToolMessage(currentToolCall.name, currentToolCall.description),
        );
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [mode, currentToolCall]);

  const isProcessing = mode === "thinking" || mode === "tool_execution";
  const totalTokens = sessionStats.inputTokens + sessionStats.outputTokens;

  // Build status hints
  const hints: string[] = [];

  // Interrupt hint
  if (isProcessing) {
    hints.push(
      interruptPending
        ? STATUS_HINTS.INTERRUPT_CONFIRM
        : STATUS_HINTS.INTERRUPT,
    );
  }

  // Todo toggle hint (only show when there's a plan)
  if (hasPlan) {
    hints.push(
      todosVisible ? STATUS_HINTS.TOGGLE_TODOS : STATUS_HINTS.TOGGLE_TODOS_SHOW,
    );
  }

  // Elapsed time
  hints.push(formatDuration(elapsed));

  // Token count
  if (totalTokens > 0) {
    hints.push(`↓ ${formatTokens(totalTokens)} tokens`);
  }

  // Thinking time (only during thinking or show last duration)
  if (sessionStats.thinkingStartTime !== null) {
    hints.push(`${thinkingTime}s`);
  } else if (sessionStats.lastThinkingDuration > 0 && mode === "idle") {
    hints.push(`thought for ${sessionStats.lastThinkingDuration}s`);
  }

  const modeDisplay = getModeDisplay(mode, statusMessage, currentToolCall);

  return (
    <Box
      paddingX={1}
      justifyContent="space-between"
      borderStyle="single"
      borderColor="gray"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
    >
      <Box>
        <Text color={modeDisplay.color}>{modeDisplay.text}</Text>
      </Box>
      <Box>
        <Text dimColor>{hints.join(STATUS_SEPARATOR)}</Text>
      </Box>
    </Box>
  );
}
