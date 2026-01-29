import { Show, createSignal, createEffect, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import type { LogEntry } from "@/types/tui";
import { Spinner } from "@tui-solid/ui/spinner";
import { addDebugLog } from "@tui-solid/components/debug-log-panel";

interface StreamingMessageProps {
  entry: LogEntry;
}

export function StreamingMessage(props: StreamingMessageProps) {
  const theme = useTheme();
  const app = useAppStore();

  // Use local signals that are updated via createEffect
  // This ensures proper reactivity with the store
  const [displayContent, setDisplayContent] = createSignal(props.entry.content);
  const [isActiveStreaming, setIsActiveStreaming] = createSignal(
    props.entry.metadata?.isStreaming ?? false
  );

  onMount(() => {
    addDebugLog("render", `StreamingMessage mounted for entry: ${props.entry.id}`);
  });

  // Effect to sync content from store's streamingLog
  // Use individual property accessors for fine-grained reactivity
  createEffect(() => {
    // Use dedicated property accessors that directly access store properties
    const logId = app.streamingLogId();
    const isActive = app.streamingLogIsActive();
    const storeContent = app.streamingLogContent();

    // Check if this entry is the currently streaming log
    const isCurrentLog = logId === props.entry.id;

    addDebugLog("render", `Effect: logId=${logId}, entryId=${props.entry.id}, isActive=${isActive}, contentLen=${storeContent?.length ?? 0}`);

    if (isCurrentLog && isActive) {
      setDisplayContent(storeContent);
      setIsActiveStreaming(true);
    } else if (isCurrentLog && !isActive) {
      // Streaming just completed for this log
      setIsActiveStreaming(false);
      // Keep the content we have
    } else {
      // Not the current streaming log, use entry content
      setDisplayContent(props.entry.content);
      setIsActiveStreaming(props.entry.metadata?.isStreaming ?? false);
    }
  });

  const hasContent = () => {
    const c = displayContent();
    return Boolean(c && c.length > 0);
  };

  return (
    <box flexDirection="column" marginBottom={1}>
      <box flexDirection="row">
        <text fg={theme.colors.roleAssistant} attributes={TextAttributes.BOLD}>
          CodeTyper
        </text>
        <Show when={isActiveStreaming()}>
          <box marginLeft={1}>
            <Spinner />
          </box>
        </Show>
      </box>
      <Show when={hasContent()}>
        <box marginLeft={2}>
          <text wrapMode="word">{displayContent()}</text>
        </box>
      </Show>
    </box>
  );
}
