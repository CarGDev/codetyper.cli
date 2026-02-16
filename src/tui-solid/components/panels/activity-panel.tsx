/**
 * Activity Panel
 *
 * Right sidebar showing session summary: context usage, modified files, etc.
 */

import { For, Show, createMemo } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import {
  TOKEN_WARNING_THRESHOLD,
  TOKEN_CRITICAL_THRESHOLD,
} from "@constants/token";
import { CopilotUsageSection } from "./copilot-usage";

/** Extract filename from a path without importing node:path */
const getFileName = (filePath: string): string => {
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? filePath;
};

const PANEL_WIDTH = 36;

const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

const formatPercent = (value: number): string => `${Math.round(value)}%`;

export function ActivityPanel() {
  const theme = useTheme();
  const app = useAppStore();

  const contextUsage = createMemo(() => {
    const stats = app.sessionStats();
    const totalTokens = stats.inputTokens + stats.outputTokens;
    const maxTokens = stats.contextMaxTokens;
    const percent = maxTokens > 0 ? (totalTokens / maxTokens) * 100 : 0;

    let status: "normal" | "warning" | "critical" = "normal";
    if (percent >= TOKEN_CRITICAL_THRESHOLD * 100) {
      status = "critical";
    } else if (percent >= TOKEN_WARNING_THRESHOLD * 100) {
      status = "warning";
    }

    return { total: totalTokens, max: maxTokens, percent, status };
  });

  const tokenColor = createMemo(() => {
    const s = contextUsage().status;
    if (s === "critical") return theme.colors.error;
    if (s === "warning") return theme.colors.warning;
    return theme.colors.textDim;
  });

  const modifiedFiles = createMemo(() => {
    return [...app.modifiedFiles()].sort(
      (a, b) => b.lastModified - a.lastModified,
    );
  });

  const totalChanges = createMemo(() => {
    const files = app.modifiedFiles();
    return {
      additions: files.reduce((sum, f) => sum + f.additions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    };
  });

  return (
    <box
      flexDirection="column"
      width={PANEL_WIDTH}
      border={["left"]}
      borderColor={theme.colors.border}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      flexShrink={0}
    >
      {/* Copilot Usage Section (when provider is copilot) */}
      <CopilotUsageSection />

      {/* Context Section */}
      <box flexDirection="column" marginBottom={1}>
        <text fg={theme.colors.text} attributes={TextAttributes.BOLD}>
          Context
        </text>
        <box flexDirection="row" marginTop={1}>
          <text fg={tokenColor()}>
            {formatTokenCount(contextUsage().total)}
          </text>
          <text fg={theme.colors.textDim}> / </text>
          <text fg={theme.colors.textDim}>
            {formatTokenCount(contextUsage().max)}
          </text>
          <text fg={theme.colors.textDim}> tokens</text>
        </box>
        <text fg={tokenColor()}>
          {formatPercent(contextUsage().percent)} used
        </text>
      </box>

      {/* Separator */}
      <box marginBottom={1}>
        <text fg={theme.colors.border}>{"─".repeat(PANEL_WIDTH - 2)}</text>
      </box>

      {/* Modified Files Section */}
      <box flexDirection="column">
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.colors.text} attributes={TextAttributes.BOLD}>
            Modified Files
          </text>
          <Show when={modifiedFiles().length > 0}>
            <text fg={theme.colors.textDim}>{modifiedFiles().length}</text>
          </Show>
        </box>

        <Show
          when={modifiedFiles().length > 0}
          fallback={
            <text fg={theme.colors.textDim}>No files modified yet</text>
          }
        >
          <box flexDirection="column" marginTop={1}>
            <For each={modifiedFiles()}>
              {(file) => (
                <box flexDirection="row" marginBottom={0}>
                  <text fg={theme.colors.text}>
                    {getFileName(file.filePath)}
                  </text>
                  <text fg={theme.colors.textDim}> </text>
                  <Show when={file.additions > 0}>
                    <text fg={theme.colors.success}>+{file.additions}</text>
                  </Show>
                  <Show when={file.deletions > 0}>
                    <text fg={theme.colors.textDim}> </text>
                    <text fg={theme.colors.error}>-{file.deletions}</text>
                  </Show>
                </box>
              )}
            </For>
          </box>

          {/* Totals */}
          <box marginTop={1}>
            <text fg={theme.colors.textDim}>Total: </text>
            <Show when={totalChanges().additions > 0}>
              <text fg={theme.colors.success}>+{totalChanges().additions}</text>
            </Show>
            <Show when={totalChanges().deletions > 0}>
              <text fg={theme.colors.textDim}> </text>
              <text fg={theme.colors.error}>-{totalChanges().deletions}</text>
            </Show>
          </box>
        </Show>
      </box>
    </box>
  );
}
