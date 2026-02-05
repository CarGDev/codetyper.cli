import { Show, createMemo } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { BRAIN_BANNER, BRAIN_DISABLED } from "@constants/brain";
import {
  TOKEN_WARNING_THRESHOLD,
  TOKEN_CRITICAL_THRESHOLD,
} from "@constants/token";

interface HeaderProps {
  showBanner?: boolean;
}

const MODE_LABELS = {
  agent: "Agent",
  ask: "Ask",
  "code-review": "Code Review",
} as const;

const MODE_DESCRIPTIONS = {
  agent: "Full access - can modify files",
  ask: "Read-only - answers questions",
  "code-review": "Review PRs and diffs",
} as const;

const MODE_COLORS = {
  agent: "warning",
  ask: "info",
  "code-review": "success",
} as const;

const BRAIN_STATUS_COLORS = {
  connected: "success",
  connecting: "warning",
  disconnected: "textDim",
  error: "error",
} as const;

const TOKEN_STATUS_COLORS = {
  normal: "textDim",
  warning: "warning",
  critical: "error",
  compacting: "info",
} as const;

/**
 * Format token count for display (e.g., 45.2K)
 */
const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

export function Header(props: HeaderProps) {
  const theme = useTheme();
  const app = useAppStore();
  const showBanner = () => props.showBanner ?? true;

  const modeColor = createMemo(() => {
    const colorKey = MODE_COLORS[app.interactionMode()];
    return theme.colors[colorKey];
  });

  const brainColor = createMemo(() => {
    const brain = app.brain();
    const colorKey = BRAIN_STATUS_COLORS[brain.status];
    return theme.colors[colorKey];
  });

  const shouldShowBrainBanner = createMemo(() => {
    if (BRAIN_DISABLED) return false;
    const brain = app.brain();
    return brain.showBanner && brain.status === "disconnected";
  });

  // Context window usage calculation
  const contextUsage = createMemo(() => {
    const stats = app.sessionStats();
    const totalTokens = stats.inputTokens + stats.outputTokens;
    const maxTokens = stats.contextMaxTokens;
    const usagePercent = maxTokens > 0 ? (totalTokens / maxTokens) * 100 : 0;

    let status: "normal" | "warning" | "critical" | "compacting" = "normal";
    if (app.isCompacting()) {
      status = "compacting";
    } else if (usagePercent >= TOKEN_CRITICAL_THRESHOLD * 100) {
      status = "critical";
    } else if (usagePercent >= TOKEN_WARNING_THRESHOLD * 100) {
      status = "warning";
    }

    return {
      current: totalTokens,
      max: maxTokens,
      percent: usagePercent,
      status,
    };
  });

  const tokenColor = createMemo(() => {
    const colorKey = TOKEN_STATUS_COLORS[contextUsage().status];
    return theme.colors[colorKey];
  });

  return (
    <box flexDirection="column">
      {/* Brain Banner - shown when not connected */}
      <Show when={shouldShowBrainBanner()}>
        <box
          flexDirection="row"
          justifyContent="space-between"
          paddingLeft={1}
          paddingRight={1}
          backgroundColor="#1a1a2e"
        >
          <box flexDirection="row" gap={1}>
            <text fg="#ff69b4" attributes={TextAttributes.BOLD}>
              {BRAIN_BANNER.EMOJI_CONNECTED}
            </text>
            <text fg="#ffffff" attributes={TextAttributes.BOLD}>
              {BRAIN_BANNER.TITLE}
            </text>
            <text fg={theme.colors.textDim}>-</text>
            <text fg={theme.colors.textDim}>{BRAIN_BANNER.CTA}:</text>
            <text fg={theme.colors.info} attributes={TextAttributes.UNDERLINE}>
              {BRAIN_BANNER.URL}
            </text>
          </box>
          <text fg={theme.colors.textDim}>[Ctrl+B dismiss]</text>
        </box>
      </Show>

      {/* Main Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        borderColor={theme.colors.border}
        border={["bottom"]}
      >
        <box flexDirection="row" gap={1}>
          <Show when={showBanner()}>
            <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
              CodeTyper
            </text>
          </Show>
          <text fg={theme.colors.textDim}>v{app.version()}</text>
          <text fg={theme.colors.textDim}>|</text>
          <box flexDirection="row">
            <text fg={modeColor()} attributes={TextAttributes.BOLD}>
              [{MODE_LABELS[app.interactionMode()]}]
            </text>
            <Show when={app.currentAgent() !== "default"}>
              <text
                fg={theme.colors.secondary}
                attributes={TextAttributes.BOLD}
              >
                {" "}
                @{app.currentAgent()}
              </text>
            </Show>
            <text fg={theme.colors.textDim}>
              {" "}
              - {MODE_DESCRIPTIONS[app.interactionMode()]}
            </text>
          </box>
        </box>

        <box flexDirection="row" gap={2}>
          {/* Context Window Usage */}
          <Show when={contextUsage().max > 0}>
            <box flexDirection="row">
              <text fg={tokenColor()}>
                {formatTokenCount(contextUsage().current)}
              </text>
              <text fg={theme.colors.textDim}>/</text>
              <text fg={theme.colors.textDim}>
                {formatTokenCount(contextUsage().max)}
              </text>
              <Show when={contextUsage().status === "compacting"}>
                <text fg={theme.colors.info}> [compacting]</text>
              </Show>
            </box>
          </Show>

          {/* Brain Status Indicator - hidden when BRAIN_DISABLED */}
          <Show when={!BRAIN_DISABLED}>
            <box flexDirection="row">
              <text fg={brainColor()}>
                {app.brain().status === "connected"
                  ? BRAIN_BANNER.EMOJI_CONNECTED
                  : app.brain().status === "connecting"
                    ? "..."
                    : BRAIN_BANNER.EMOJI_DISCONNECTED}
              </text>
              <Show when={app.brain().status === "connected"}>
                <text fg={theme.colors.textDim}>
                  {" "}
                  {app.brain().knowledgeCount}K/{app.brain().memoryCount}M
                </text>
              </Show>
            </box>
          </Show>

          <box flexDirection="row">
            <text fg={theme.colors.textDim}>Provider: </text>
            <text fg={theme.colors.secondary}>{app.provider()}</text>
          </box>
          <box flexDirection="row">
            <text fg={theme.colors.textDim}>Model: </text>
            <text fg={theme.colors.accent}>{app.model() || "auto"}</text>
          </box>
          <Show when={app.sessionId()}>
            <box flexDirection="row">
              <text fg={theme.colors.textDim}>Session: </text>
              <text fg={theme.colors.info}>
                {app.sessionId()?.replace("session-", "").slice(-5)}
              </text>
            </box>
          </Show>
        </box>
      </box>
    </box>
  );
}
