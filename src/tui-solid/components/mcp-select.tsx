import { createSignal, createMemo, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { MCPServerDisplay } from "@/types/tui";

interface MCPSelectProps {
  servers: MCPServerDisplay[];
  onSelect: (serverId: string) => void;
  onAddNew: () => void;
  onClose: () => void;
  isActive?: boolean;
}

const STATUS_COLORS: Record<MCPServerDisplay["status"], string> = {
  connected: "success",
  disconnected: "textDim",
  error: "error",
};

export function MCPSelect(props: MCPSelectProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const totalItems = createMemo(() => props.servers.length + 1);

  const isAddNewSelected = createMemo(
    () => selectedIndex() === props.servers.length,
  );

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      if (isAddNewSelected()) {
        props.onAddNew();
      } else {
        const server = props.servers[selectedIndex()];
        if (server) {
          props.onSelect(server.id);
          props.onClose();
        }
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems() - 1));
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) => (prev < totalItems() - 1 ? prev + 1 : 0));
      evt.preventDefault();
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.info}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
    >
      <box marginBottom={1}>
        <text fg={theme.colors.info} attributes={TextAttributes.BOLD}>
          MCP Servers
        </text>
      </box>

      <Show when={props.servers.length > 0}>
        <For each={props.servers}>
          {(server, index) => {
            const isSelected = () => index() === selectedIndex();
            const statusColorKey = STATUS_COLORS[
              server.status
            ] as keyof typeof theme.colors;
            const statusColor = theme.colors[statusColorKey];
            const statusColorStr =
              typeof statusColor === "string"
                ? statusColor
                : theme.colors.textDim;

            return (
              <box flexDirection="row">
                <text
                  fg={isSelected() ? theme.colors.info : undefined}
                  attributes={
                    isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                  }
                >
                  {isSelected() ? "> " : "  "}
                </text>
                <text fg={statusColorStr}>● </text>
                <text
                  fg={isSelected() ? theme.colors.info : undefined}
                  attributes={
                    isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                  }
                >
                  {server.name}
                </text>
                <Show when={server.description}>
                  <text fg={theme.colors.textDim}> - {server.description}</text>
                </Show>
              </box>
            );
          }}
        </For>
      </Show>

      <Show when={props.servers.length === 0}>
        <text fg={theme.colors.textDim}>No MCP servers configured</text>
      </Show>

      <box flexDirection="row" marginTop={props.servers.length > 0 ? 1 : 0}>
        <text
          fg={isAddNewSelected() ? theme.colors.success : undefined}
          attributes={
            isAddNewSelected() ? TextAttributes.BOLD : TextAttributes.NONE
          }
        >
          {isAddNewSelected() ? "> " : "  "}
        </text>
        <text fg={theme.colors.success}>+ </text>
        <text
          fg={isAddNewSelected() ? theme.colors.success : theme.colors.text}
          attributes={
            isAddNewSelected() ? TextAttributes.BOLD : TextAttributes.NONE
          }
        >
          Add new server
        </text>
      </box>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Esc close
        </text>
      </box>
    </box>
  );
}
