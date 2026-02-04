import { createSignal, For, Show, createMemo } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { SelectOption } from "@/types/tui";

export type { SelectOption } from "@/types/tui";

interface SelectMenuProps {
  options: SelectOption[];
  onSelect: (option: SelectOption) => void;
  title?: string;
  initialIndex?: number;
  isActive?: boolean;
}

export function SelectMenu(props: SelectMenuProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = createSignal(
    props.initialIndex ?? 0,
  );
  const isActive = () => props.isActive ?? true;

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "up") {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : props.options.length - 1,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) =>
        prev < props.options.length - 1 ? prev + 1 : 0,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "return") {
      props.onSelect(props.options[selectedIndex()]);
      evt.preventDefault();
      return;
    }

    if (evt.name.length === 1) {
      const lowerInput = evt.name.toLowerCase();
      const optionIndex = props.options.findIndex(
        (o) => o.key?.toLowerCase() === lowerInput,
      );
      if (optionIndex !== -1) {
        props.onSelect(props.options[optionIndex]);
        evt.preventDefault();
      }
    }
  });

  const hasShortcuts = createMemo(() => props.options.some((o) => o.key));

  return (
    <box flexDirection="column" backgroundColor={theme.colors.background}>
      <Show when={props.title}>
        <box marginBottom={1}>
          <text attributes={TextAttributes.BOLD} fg={theme.colors.warning}>
            {props.title}
          </text>
        </box>
      </Show>

      <For each={props.options}>
        {(option, index) => {
          const isSelected = () => index() === selectedIndex();
          return (
            <box flexDirection="row">
              <text
                fg={isSelected() ? theme.colors.primary : undefined}
                attributes={
                  isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                }
              >
                {isSelected() ? "❯ " : "  "}
              </text>
              <Show when={option.key}>
                <text
                  fg={
                    isSelected() ? theme.colors.primary : theme.colors.textDim
                  }
                >
                  [{option.key}]{" "}
                </text>
              </Show>
              <text
                fg={isSelected() ? theme.colors.primary : undefined}
                attributes={
                  isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                }
              >
                {option.label}
              </text>
              <Show when={option.description}>
                <text fg={theme.colors.textDim}> - {option.description}</text>
              </Show>
            </box>
          );
        }}
      </For>

      <box marginTop={1} flexDirection="row">
        <text fg={theme.colors.textDim}>↑↓ to navigate • Enter to select</text>
        <Show when={hasShortcuts()}>
          <text fg={theme.colors.textDim}> • or press shortcut key</text>
        </Show>
      </box>
    </box>
  );
}
