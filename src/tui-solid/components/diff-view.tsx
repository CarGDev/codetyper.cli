import { For, Show } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { DiffLineData } from "@/types/tui";

interface DiffViewProps {
  lines: DiffLineData[];
  filePath?: string;
  additions?: number;
  deletions?: number;
  compact?: boolean;
}

export function DiffView(props: DiffViewProps) {
  const theme = useTheme();
  const compact = () => props.compact ?? false;

  return (
    <box flexDirection="column">
      <Show when={props.filePath}>
        <box flexDirection="row" marginBottom={1}>
          <text fg={theme.colors.diffHeader} attributes={TextAttributes.BOLD}>
            {props.filePath}
          </text>
          <Show when={(props.additions ?? 0) > 0 || (props.deletions ?? 0) > 0}>
            <text fg={theme.colors.textDim}> (</text>
            <Show when={(props.additions ?? 0) > 0}>
              <text fg={theme.colors.diffAdded}>+{props.additions}</text>
            </Show>
            <Show
              when={(props.additions ?? 0) > 0 && (props.deletions ?? 0) > 0}
            >
              <text fg={theme.colors.textDim}>/</text>
            </Show>
            <Show when={(props.deletions ?? 0) > 0}>
              <text fg={theme.colors.diffRemoved}>-{props.deletions}</text>
            </Show>
            <text fg={theme.colors.textDim}>)</text>
          </Show>
        </box>
      </Show>

      <For each={props.lines}>
        {(line) => <DiffLine line={line} compact={compact()} />}
      </For>
    </box>
  );
}

interface DiffLineProps {
  line: DiffLineData;
  compact: boolean;
}

function DiffLine(props: DiffLineProps) {
  const theme = useTheme();

  const lineColor = (): string => {
    // Use white text for add/remove lines since they have colored backgrounds
    if (props.line.type === "add" || props.line.type === "remove") {
      return theme.colors.text;
    }
    const colorMap: Record<string, string> = {
      context: theme.colors.diffContext,
      header: theme.colors.diffHeader,
      hunk: theme.colors.diffHunk,
      summary: theme.colors.textDim,
    };
    return colorMap[props.line.type] ?? theme.colors.text;
  };

  const prefix = (): string => {
    const prefixMap: Record<string, string> = {
      add: "+",
      remove: "-",
      context: " ",
      header: "",
      hunk: "",
      summary: "",
    };
    return prefixMap[props.line.type] ?? " ";
  };

  const bgColor = (): string | undefined => {
    if (props.line.type === "add") return theme.colors.bgAdded;
    if (props.line.type === "remove") return theme.colors.bgRemoved;
    return undefined;
  };

  return (
    <box flexDirection="row">
      <Show
        when={
          !props.compact &&
          (props.line.type === "add" ||
            props.line.type === "remove" ||
            props.line.type === "context")
        }
      >
        <text fg={theme.colors.textDim} width={4}>
          {props.line.oldLineNum?.toString().padStart(3) ?? "   "}
        </text>
        <text fg={theme.colors.textDim} width={4}>
          {props.line.newLineNum?.toString().padStart(3) ?? "   "}
        </text>
      </Show>
      <text fg={lineColor()} bg={bgColor()}>
        {prefix()}
        {props.line.content}
      </text>
    </box>
  );
}

export { parseDiffOutput, isDiffContent } from "@/utils/diff";
