import { For, Show, createMemo } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
}

export interface Plan {
  id: string;
  title: string;
  items: TodoItem[];
}

interface TodoPanelProps {
  plan: Plan | null;
  visible?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "error",
  medium: "warning",
  low: "info",
};

export function TodoPanel(props: TodoPanelProps) {
  const theme = useTheme();
  const visible = () => props.visible ?? true;

  const completedCount = createMemo(
    () => props.plan?.items.filter((i) => i.completed).length ?? 0,
  );

  const totalCount = createMemo(() => props.plan?.items.length ?? 0);

  const progress = createMemo(() => {
    if (totalCount() === 0) return 0;
    return Math.round((completedCount() / totalCount()) * 100);
  });

  return (
    <Show when={visible() && props.plan}>
      <box
        flexDirection="column"
        width={30}
        borderColor={theme.colors.border}
        border={["top", "bottom", "left", "right"]}
        paddingLeft={1}
        paddingRight={1}
      >
        <box
          marginBottom={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
            Plan
          </text>
          <text fg={theme.colors.textDim}>
            {completedCount()}/{totalCount()} ({progress()}%)
          </text>
        </box>

        <scrollbox stickyScroll={false} flexGrow={1}>
          <box flexDirection="column">
            <For each={props.plan!.items}>
              {(item) => {
                const priorityColorKey = item.priority
                  ? (PRIORITY_COLORS[
                      item.priority
                    ] as keyof typeof theme.colors)
                  : undefined;
                const priorityColor = priorityColorKey
                  ? theme.colors[priorityColorKey]
                  : undefined;
                const priorityColorStr =
                  typeof priorityColor === "string" ? priorityColor : undefined;

                return (
                  <box flexDirection="row" marginBottom={1}>
                    <text
                      fg={
                        item.completed
                          ? theme.colors.success
                          : theme.colors.textDim
                      }
                    >
                      {item.completed ? "✓" : "○"}{" "}
                    </text>
                    <text
                      fg={
                        item.completed
                          ? theme.colors.textDim
                          : theme.colors.text
                      }
                      attributes={
                        item.completed
                          ? TextAttributes.STRIKETHROUGH
                          : TextAttributes.NONE
                      }
                      wrapMode="word"
                    >
                      {item.text}
                    </text>
                    <Show when={priorityColorStr && !item.completed}>
                      <text fg={priorityColorStr}> ●</text>
                    </Show>
                  </box>
                );
              }}
            </For>
          </box>
        </scrollbox>
      </box>
    </Show>
  );
}
