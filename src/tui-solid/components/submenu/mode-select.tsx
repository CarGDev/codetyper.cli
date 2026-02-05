import { createSignal, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import type { InteractionMode } from "@/types/tui";

interface ModeOption {
  id: InteractionMode;
  name: string;
  description: string;
  color: "warning" | "info" | "success";
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: "agent",
    name: "Agent",
    description: "Full access - can read, write, and execute commands",
    color: "warning",
  },
  {
    id: "ask",
    name: "Ask",
    description: "Read-only - answers questions without modifying files",
    color: "info",
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Review PRs, diffs, and provide feedback on code changes",
    color: "success",
  },
];

interface ModeSelectProps {
  onSelect: (mode: InteractionMode) => void;
  onClose: () => void;
  isActive?: boolean;
}

export function ModeSelect(props: ModeSelectProps) {
  const theme = useTheme();
  const app = useAppStore();
  const isActive = () => props.isActive ?? true;

  const currentModeIndex = () =>
    MODE_OPTIONS.findIndex((m) => m.id === app.interactionMode());
  const [selectedIndex, setSelectedIndex] = createSignal(
    currentModeIndex() >= 0 ? currentModeIndex() : 0,
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
      const mode = MODE_OPTIONS[selectedIndex()];
      if (mode) {
        props.onSelect(mode.id);
        props.onClose();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : MODE_OPTIONS.length - 1,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) =>
        prev < MODE_OPTIONS.length - 1 ? prev + 1 : 0,
      );
      evt.preventDefault();
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.primary}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
    >
      <box marginBottom={1}>
        <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
          Select Mode
        </text>
      </box>

      <For each={MODE_OPTIONS}>
        {(mode, index) => {
          const isSelected = () => index() === selectedIndex();
          const isCurrent = () => mode.id === app.interactionMode();
          const modeColor = theme.colors[mode.color];

          return (
            <box flexDirection="column" marginBottom={1}>
              <box flexDirection="row">
                <text
                  fg={isSelected() ? theme.colors.primary : undefined}
                  attributes={
                    isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                  }
                >
                  {isSelected() ? "> " : "  "}
                </text>
                <text
                  fg={isSelected() ? modeColor : theme.colors.text}
                  attributes={
                    isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                  }
                >
                  {mode.name}
                </text>
                {isCurrent() && (
                  <text fg={theme.colors.success}> (current)</text>
                )}
              </box>
              <box>
                <text fg={theme.colors.textDim}> {mode.description}</text>
              </box>
            </box>
          );
        }}
      </For>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Esc close
        </text>
      </box>
    </box>
  );
}
