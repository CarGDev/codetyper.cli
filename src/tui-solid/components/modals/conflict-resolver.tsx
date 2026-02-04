/**
 * Conflict Resolver
 *
 * UI component for displaying and resolving file conflicts between agents.
 */

import { For, Show, createSignal, createMemo, onMount, onCleanup } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { multiAgentStore } from "@stores/core/multi-agent-store";
import type { FileConflict, ConflictStrategy } from "@/types/multi-agent";
import { CONFLICT_STRATEGY_DESCRIPTIONS } from "@constants/multi-agent";

interface ConflictResolverProps {
  visible?: boolean;
  onResolve?: (filePath: string, strategy: ConflictStrategy) => void;
  onDismiss?: () => void;
}

const STRATEGY_OPTIONS: Array<{ value: ConflictStrategy; label: string }> = [
  { value: "serialize", label: "Wait" },
  { value: "abort-newer", label: "Abort Newer" },
  { value: "merge-results", label: "Merge" },
  { value: "isolated", label: "Isolate" },
];

export function ConflictResolver(props: ConflictResolverProps) {
  const theme = useTheme();
  const visible = () => props.visible ?? true;

  const [conflicts, setConflicts] = createSignal<FileConflict[]>([]);
  const [selectedConflictIndex, setSelectedConflictIndex] = createSignal(0);
  const [selectedStrategyIndex] = createSignal(0);

  onMount(() => {
    const unsubscribe = multiAgentStore.subscribe((state) => {
      const unresolvedConflicts = state.conflicts.filter((c) => !c.resolution);
      setConflicts(unresolvedConflicts);

      // Reset selection if current conflict was resolved
      if (selectedConflictIndex() >= unresolvedConflicts.length) {
        setSelectedConflictIndex(Math.max(0, unresolvedConflicts.length - 1));
      }
    });

    onCleanup(unsubscribe);
  });

  const currentConflict = createMemo(() => conflicts()[selectedConflictIndex()]);

  const getAgentNames = (agentIds: string[]): string[] => {
    const state = multiAgentStore.getState();
    return agentIds.map((id) => {
      const instance = state.instances.get(id);
      return instance?.definition.name ?? id;
    });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const selectedStrategy = createMemo(() => STRATEGY_OPTIONS[selectedStrategyIndex()]);

  return (
    <Show when={visible() && conflicts().length > 0}>
      <box
        flexDirection="column"
        borderColor={theme.colors.warning}
        border={["top", "bottom", "left", "right"]}
        padding={1}
        backgroundColor={theme.colors.background}
      >
        {/* Header */}
        <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <text fg={theme.colors.warning} attributes={TextAttributes.BOLD}>
            ⚠ File Conflict Detected
          </text>
          <text fg={theme.colors.textDim}>
            {selectedConflictIndex() + 1}/{conflicts().length}
          </text>
        </box>

        {/* Conflict Details */}
        <Show when={currentConflict()}>
          <box flexDirection="column" marginBottom={1}>
            <box flexDirection="row" gap={1}>
              <text fg={theme.colors.textDim}>File:</text>
              <text fg={theme.colors.text} attributes={TextAttributes.BOLD}>
                {currentConflict()!.filePath}
              </text>
            </box>

            <box flexDirection="row" gap={1}>
              <text fg={theme.colors.textDim}>Agents:</text>
              <text fg={theme.colors.text}>
                {getAgentNames(currentConflict()!.conflictingAgentIds).join(" vs ")}
              </text>
            </box>

            <box flexDirection="row" gap={1}>
              <text fg={theme.colors.textDim}>Detected:</text>
              <text fg={theme.colors.text}>
                {formatTime(currentConflict()!.detectedAt)}
              </text>
            </box>
          </box>
        </Show>

        {/* Resolution Options */}
        <box flexDirection="column" marginBottom={1}>
          <text fg={theme.colors.primary} marginBottom={1}>
            Resolution Strategy:
          </text>

          <For each={STRATEGY_OPTIONS}>
            {(option, index) => (
              <box
                flexDirection="row"
                gap={1}
                backgroundColor={index() === selectedStrategyIndex() ? theme.colors.bgHighlight : undefined}
                paddingLeft={1}
              >
                <text fg={index() === selectedStrategyIndex() ? theme.colors.primary : theme.colors.textDim}>
                  {index() === selectedStrategyIndex() ? "▸" : " "}
                </text>
                <text
                  fg={index() === selectedStrategyIndex() ? theme.colors.text : theme.colors.textDim}
                  attributes={index() === selectedStrategyIndex() ? TextAttributes.BOLD : TextAttributes.NONE}
                >
                  {option.label}
                </text>
              </box>
            )}
          </For>
        </box>

        {/* Strategy Description */}
        <box
          flexDirection="column"
          marginBottom={1}
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={theme.colors.backgroundPanel}
        >
          <text fg={theme.colors.textDim} wrapMode="word">
            {CONFLICT_STRATEGY_DESCRIPTIONS[selectedStrategy().value]}
          </text>
        </box>

        {/* Actions */}
        <box flexDirection="row" gap={2} justifyContent="flex-end">
          <text fg={theme.colors.textDim}>
            [↑/↓] Select  [Enter] Resolve  [Esc] Dismiss
          </text>
        </box>
      </box>
    </Show>
  );
}

/**
 * Compact conflict indicator for status bar
 */
export function ConflictIndicator() {
  const theme = useTheme();
  const [conflictCount, setConflictCount] = createSignal(0);

  onMount(() => {
    const unsubscribe = multiAgentStore.subscribe((state) => {
      const unresolvedCount = state.conflicts.filter((c) => !c.resolution).length;
      setConflictCount(unresolvedCount);
    });

    onCleanup(unsubscribe);
  });

  return (
    <Show when={conflictCount() > 0}>
      <box flexDirection="row" gap={1}>
        <text fg={theme.colors.warning}>
          ⚠ {conflictCount()} conflict{conflictCount() > 1 ? "s" : ""}
        </text>
      </box>
    </Show>
  );
}
