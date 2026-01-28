import { Show, Switch, Match, For } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { LogEntry, ToolStatus } from "@/types/tui";
import {
  TOOL_STATUS_ICONS,
  TOOL_STATUS_COLORS,
} from "@constants/tui-components";
import { DiffView } from "@tui-solid/components/diff-view";
import { StreamingMessage } from "@tui-solid/components/streaming-message";
import { parseDiffOutput, isDiffContent } from "@/utils/diff";

interface LogEntryDisplayProps {
  entry: LogEntry;
}

function UserEntry(props: { entry: LogEntry }) {
  const theme = useTheme();
  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg={theme.colors.roleUser} attributes={TextAttributes.BOLD}>
        You
      </text>
      <box marginLeft={2}>
        <text>{props.entry.content}</text>
      </box>
    </box>
  );
}

function AssistantEntry(props: { entry: LogEntry }) {
  const theme = useTheme();
  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg={theme.colors.roleAssistant} attributes={TextAttributes.BOLD}>
        CodeTyper
      </text>
      <box marginLeft={2}>
        <text wrapMode="word">{props.entry.content}</text>
      </box>
    </box>
  );
}

function ErrorEntry(props: { entry: LogEntry }) {
  const theme = useTheme();
  return (
    <box marginBottom={1}>
      <text fg={theme.colors.error}>✗ Error: {props.entry.content}</text>
    </box>
  );
}

function SystemEntry(props: { entry: LogEntry }) {
  const theme = useTheme();
  return (
    <box marginBottom={1}>
      <text fg={theme.colors.textDim}>⚙ {props.entry.content}</text>
    </box>
  );
}

function ThinkingEntry(props: { entry: LogEntry }) {
  const theme = useTheme();
  return (
    <box marginBottom={1}>
      <text fg={theme.colors.modeThinking}>● {props.entry.content}</text>
    </box>
  );
}

function ToolEntry(props: { entry: LogEntry }) {
  const theme = useTheme();
  const toolStatus = (): ToolStatus =>
    props.entry.metadata?.toolStatus ?? "pending";
  const statusIcon = () => TOOL_STATUS_ICONS[toolStatus()];
  const statusColor = (): string => {
    const colorKey = TOOL_STATUS_COLORS[toolStatus()];
    const color = theme.colors[colorKey as keyof typeof theme.colors];
    if (typeof color === "string") return color;
    return theme.colors.textDim;
  };

  const hasDiff = () =>
    props.entry.metadata?.diffData?.isDiff ||
    isDiffContent(props.entry.content);

  const isMultiline = () => props.entry.content.includes("\n");
  const lines = () => props.entry.content.split("\n");

  return (
    <Switch
      fallback={
        <DefaultToolEntry
          {...props}
          statusIcon={statusIcon()}
          statusColor={statusColor()}
        />
      }
    >
      <Match when={hasDiff() && props.entry.metadata?.toolStatus === "success"}>
        <DiffToolEntry
          {...props}
          statusIcon={statusIcon()}
          statusColor={statusColor()}
        />
      </Match>
      <Match when={isMultiline()}>
        <MultilineToolEntry
          {...props}
          statusIcon={statusIcon()}
          statusColor={statusColor()}
          lines={lines()}
        />
      </Match>
    </Switch>
  );
}

function DiffToolEntry(props: {
  entry: LogEntry;
  statusIcon: string;
  statusColor: string;
}) {
  const theme = useTheme();
  const diffData = () => parseDiffOutput(props.entry.content);

  return (
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row">
        <text fg={props.statusColor}>{props.statusIcon} </text>
        <text fg={theme.colors.roleTool}>
          {props.entry.metadata?.toolName ?? "tool"}
        </text>
        <Show when={props.entry.metadata?.toolDescription}>
          <text fg={theme.colors.textDim}>: </text>
          <text fg={theme.colors.textDim}>
            {props.entry.metadata?.toolDescription}
          </text>
        </Show>
      </box>
      <box marginLeft={2}>
        <DiffView
          lines={diffData().lines}
          filePath={diffData().filePath}
          additions={diffData().additions}
          deletions={diffData().deletions}
        />
      </box>
    </box>
  );
}

function MultilineToolEntry(props: {
  entry: LogEntry;
  statusIcon: string;
  statusColor: string;
  lines: string[];
}) {
  const theme = useTheme();
  const hasDescription = () => Boolean(props.entry.metadata?.toolDescription);

  return (
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row">
        <text fg={props.statusColor}>{props.statusIcon} </text>
        <text fg={theme.colors.roleTool}>
          {props.entry.metadata?.toolName ?? "tool"}
        </text>
        <text fg={theme.colors.textDim}>: </text>
        <text fg={theme.colors.textDim}>
          {props.entry.metadata?.toolDescription ?? props.lines[0]}
        </text>
      </box>
      <box flexDirection="column" marginLeft={2}>
        <For each={hasDescription() ? props.lines : props.lines.slice(1)}>
          {(line) => <text fg={theme.colors.textDim}>{line}</text>}
        </For>
      </box>
    </box>
  );
}

function DefaultToolEntry(props: {
  entry: LogEntry;
  statusIcon: string;
  statusColor: string;
}) {
  const theme = useTheme();
  return (
    <box marginBottom={1} flexDirection="row">
      <text fg={props.statusColor}>{props.statusIcon} </text>
      <text fg={theme.colors.roleTool}>
        {props.entry.metadata?.toolName ?? "tool"}
      </text>
      <text fg={theme.colors.textDim}>: </text>
      <text fg={theme.colors.textDim}>{props.entry.content}</text>
    </box>
  );
}

function DefaultEntry(props: { entry: LogEntry }) {
  return (
    <box marginBottom={1}>
      <text>{props.entry.content}</text>
    </box>
  );
}

export function LogEntryDisplay(props: LogEntryDisplayProps) {
  return (
    <Switch fallback={<DefaultEntry entry={props.entry} />}>
      <Match when={props.entry.type === "user"}>
        <UserEntry entry={props.entry} />
      </Match>
      <Match when={props.entry.type === "assistant"}>
        <AssistantEntry entry={props.entry} />
      </Match>
      <Match when={props.entry.type === "assistant_streaming"}>
        <StreamingMessage entry={props.entry} />
      </Match>
      <Match when={props.entry.type === "tool"}>
        <ToolEntry entry={props.entry} />
      </Match>
      <Match when={props.entry.type === "error"}>
        <ErrorEntry entry={props.entry} />
      </Match>
      <Match when={props.entry.type === "system"}>
        <SystemEntry entry={props.entry} />
      </Match>
      <Match when={props.entry.type === "thinking"}>
        <ThinkingEntry entry={props.entry} />
      </Match>
    </Switch>
  );
}
