import { Show } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { LogEntry } from "@/types/tui";
import { Spinner } from "@tui-solid/ui/spinner";

interface StreamingMessageProps {
  entry: LogEntry;
}

export function StreamingMessage(props: StreamingMessageProps) {
  const theme = useTheme();
  const isStreaming = () => props.entry.metadata?.isStreaming ?? false;
  const hasContent = () => Boolean(props.entry.content);

  return (
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row">
        <text fg={theme.colors.roleAssistant} attributes={TextAttributes.BOLD}>
          CodeTyper
        </text>
        <Show when={isStreaming()}>
          <box marginLeft={1}>
            <Spinner />
          </box>
        </Show>
      </box>
      <Show when={hasContent()}>
        <box marginLeft={2}>
          <text wrapMode="word">{props.entry.content}</text>
        </box>
      </Show>
    </box>
  );
}
