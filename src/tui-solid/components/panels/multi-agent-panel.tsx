/**
 * Multi-Agent Panel
 *
 * Displays active agents, their status, and execution progress.
 */

import {
  For,
  Show,
  createMemo,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { multiAgentStore } from "@stores/core/multi-agent-store";
import type { AgentInstance, AgentInstanceStatus } from "@/types/multi-agent";

interface MultiAgentPanelProps {
  visible?: boolean;
  onSelectAgent?: (agentId: string) => void;
}

const STATUS_ICONS: Record<AgentInstanceStatus, string> = {
  pending: "◯",
  running: "●",
  waiting_conflict: "⏸",
  completed: "✓",
  error: "✗",
  cancelled: "⊘",
};

export function MultiAgentPanel(props: MultiAgentPanelProps) {
  const theme = useTheme();
  const visible = () => props.visible ?? true;

  const [instances, setInstances] = createSignal<AgentInstance[]>([]);
  const [selectedIndex] = createSignal(0);

  onMount(() => {
    const unsubscribe = multiAgentStore.subscribe((state) => {
      setInstances(Array.from(state.instances.values()));
    });

    onCleanup(unsubscribe);
  });

  const stats = createMemo(() => {
    const all = instances();
    return {
      running: all.filter((i) => i.status === "running").length,
      waiting: all.filter((i) => i.status === "waiting_conflict").length,
      completed: all.filter((i) => i.status === "completed").length,
      failed: all.filter(
        (i) => i.status === "error" || i.status === "cancelled",
      ).length,
      total: all.length,
    };
  });

  const getStatusColor = (status: AgentInstanceStatus): string => {
    const colorMap: Record<AgentInstanceStatus, keyof typeof theme.colors> = {
      pending: "textDim",
      running: "info",
      waiting_conflict: "warning",
      completed: "success",
      error: "error",
      cancelled: "textDim",
    };
    return theme.colors[colorMap[status]] as string;
  };

  const getDuration = (instance: AgentInstance): string => {
    const end = instance.completedAt ?? Date.now();
    const duration = end - instance.startedAt;
    const seconds = Math.floor(duration / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const truncateText = (text: string, maxLen: number): string => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + "...";
  };

  return (
    <Show when={visible() && instances().length > 0}>
      <box
        flexDirection="column"
        width={35}
        borderColor={theme.colors.border}
        border={["top", "bottom", "left", "right"]}
        paddingLeft={1}
        paddingRight={1}
      >
        {/* Header */}
        <box
          marginBottom={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
            Agents
          </text>
          <text fg={theme.colors.textDim}>
            {stats().running}/{stats().total}
          </text>
        </box>

        {/* Status Summary */}
        <box flexDirection="row" gap={1} marginBottom={1}>
          <Show when={stats().running > 0}>
            <text fg={theme.colors.info}>● {stats().running}</text>
          </Show>
          <Show when={stats().waiting > 0}>
            <text fg={theme.colors.warning}>⏸ {stats().waiting}</text>
          </Show>
          <Show when={stats().completed > 0}>
            <text fg={theme.colors.success}>✓ {stats().completed}</text>
          </Show>
          <Show when={stats().failed > 0}>
            <text fg={theme.colors.error}>✗ {stats().failed}</text>
          </Show>
        </box>

        {/* Agent List */}
        <scrollbox stickyScroll={false} flexGrow={1}>
          <box flexDirection="column">
            <For each={instances()}>
              {(instance, index) => (
                <box
                  flexDirection="column"
                  marginBottom={1}
                  backgroundColor={
                    index() === selectedIndex()
                      ? theme.colors.bgHighlight
                      : undefined
                  }
                  paddingLeft={1}
                  paddingRight={1}
                >
                  <box flexDirection="row" gap={1}>
                    <text fg={getStatusColor(instance.status)}>
                      {STATUS_ICONS[instance.status]}
                    </text>
                    <text
                      fg={theme.colors.text}
                      attributes={TextAttributes.BOLD}
                      flexGrow={1}
                    >
                      {instance.definition.name}
                    </text>
                    <text fg={theme.colors.textDim}>
                      {getDuration(instance)}
                    </text>
                  </box>

                  <box flexDirection="row" marginLeft={2}>
                    <text fg={theme.colors.textDim}>
                      {truncateText(instance.config.task, 25)}
                    </text>
                  </box>

                  <Show when={instance.status === "error" && instance.error}>
                    <box flexDirection="row" marginLeft={2}>
                      <text fg={theme.colors.error}>
                        {truncateText(instance.error ?? "", 30)}
                      </text>
                    </box>
                  </Show>

                  <Show when={instance.modifiedFiles.length > 0}>
                    <box flexDirection="row" marginLeft={2}>
                      <text fg={theme.colors.textDim}>
                        {instance.modifiedFiles.length} file(s) modified
                      </text>
                    </box>
                  </Show>
                </box>
              )}
            </For>
          </box>
        </scrollbox>

        {/* Footer with conflicts */}
        <Show when={stats().waiting > 0}>
          <box
            marginTop={1}
            paddingTop={1}
            borderColor={theme.colors.border}
            border={["top"]}
          >
            <text fg={theme.colors.warning}>
              ⚠ {stats().waiting} agent(s) waiting on conflicts
            </text>
          </box>
        </Show>
      </box>
    </Show>
  );
}
