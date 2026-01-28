import { Show, createMemo } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";

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

export function Header(props: HeaderProps) {
  const theme = useTheme();
  const app = useAppStore();
  const showBanner = () => props.showBanner ?? true;

  const modeColor = createMemo(() => {
    const colorKey = MODE_COLORS[app.interactionMode()];
    return theme.colors[colorKey];
  });

  return (
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
            <text fg={theme.colors.secondary} attributes={TextAttributes.BOLD}>
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
  );
}
