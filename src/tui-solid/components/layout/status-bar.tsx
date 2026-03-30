import { createSignal, createEffect, onCleanup, createMemo } from "solid-js";
import { useAppStore } from "@tui-solid/context/app";
import { useTheme } from "@tui-solid/context/theme";
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

  if (mode === "thinking" && statusMessage) {
    return { ...baseConfig, text: statusMessage };
  }

  if (mode === "tool_execution") {
    const toolText =
      statusMessage || `✻ Running ${currentToolCall?.name ?? "tool"}…`;
    return { ...baseConfig, text: toolText };
  }

  return baseConfig;
};

export function StatusBar() {
  const app = useAppStore();
  const theme = useTheme();

  const [elapsed, setElapsed] = createSignal(0);
  const [thinkingTime, setThinkingTime] = createSignal(0);
  const [statusMessage, setStatusMessage] = createSignal("");

  let prevMode: AppMode | null = null;
  let prevToolName: string | undefined = undefined;

  // Elapsed time tracking
  // Elapsed time — uses onCleanup inside effect for proper Solid.js cleanup
  createEffect(() => {
    const startTime = app.sessionStats().startTime;
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    onCleanup(() => clearInterval(timer));
  });

  // Thinking time tracking
  createEffect(() => {
    const thinkingStart = app.sessionStats().thinkingStartTime;

    if (thinkingStart === null) {
      setThinkingTime(0);
      return;
    }

    setThinkingTime(Math.floor((Date.now() - thinkingStart) / 1000));
    const timer = setInterval(() => {
      setThinkingTime(Math.floor((Date.now() - thinkingStart) / 1000));
    }, 1000);
    onCleanup(() => clearInterval(timer));
  });

  // Rotating status message
  createEffect(() => {
    const mode = app.mode();
    const toolCall = app.currentToolCall();
    const isProcessing = mode === "thinking" || mode === "tool_execution";

    if (!isProcessing) {
      setStatusMessage("");
      return;
    }

    const modeChanged = prevMode !== mode;
    const toolChanged = prevToolName !== toolCall?.name;

    if (modeChanged || toolChanged) {
      if (mode === "thinking") {
        setStatusMessage(getThinkingMessage());
      } else if (mode === "tool_execution" && toolCall) {
        setStatusMessage(getToolMessage(toolCall.name, toolCall.description));
      }
    }

    prevMode = mode;
    prevToolName = toolCall?.name;

    const timer = setInterval(() => {
      if (mode === "thinking") {
        setStatusMessage(getThinkingMessage());
      } else if (mode === "tool_execution" && toolCall) {
        setStatusMessage(getToolMessage(toolCall.name, toolCall.description));
      }
    }, 2500);
    onCleanup(() => clearInterval(timer));
  });

  const isProcessing = createMemo(
    () => app.mode() === "thinking" || app.mode() === "tool_execution",
  );

  const totalTokens = createMemo(
    () => app.sessionStats().inputTokens + app.sessionStats().outputTokens,
  );

  const hints = createMemo(() => {
    const result: string[] = [];

    if (isProcessing()) {
      result.push(
        app.interruptPending()
          ? STATUS_HINTS.INTERRUPT_CONFIRM
          : STATUS_HINTS.INTERRUPT,
      );
    }

    result.push(formatDuration(elapsed()));

    if (totalTokens() > 0) {
      result.push(`↓ ${formatTokens(totalTokens())} tokens`);
    }

    const stats = app.sessionStats();
    if (stats.thinkingStartTime !== null) {
      result.push(`${thinkingTime()}s`);
    } else if (stats.lastThinkingDuration > 0 && app.mode() === "idle") {
      result.push(`thought for ${stats.lastThinkingDuration}s`);
    }

    return result;
  });

  const modeDisplay = createMemo(() =>
    getModeDisplay(app.mode(), statusMessage(), app.currentToolCall()),
  );

  return (
    <box
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      justifyContent="space-between"
      borderColor={theme.colors.border}
      border={["bottom"]}
    >
      <box>
        <text fg={modeDisplay().color}>{modeDisplay().text}</text>
      </box>
      <box>
        <text fg={theme.colors.textDim}>{hints().join(STATUS_SEPARATOR)}</text>
      </box>
    </box>
  );
}
