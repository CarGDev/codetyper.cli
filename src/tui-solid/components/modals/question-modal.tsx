import { createSignal, Show, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { QuestionPrompt } from "@/types/tui";

interface QuestionModalProps {
  prompt: QuestionPrompt;
  isActive?: boolean;
}

export function QuestionModal(props: QuestionModalProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [customMode, setCustomMode] = createSignal(false);
  const [customText, setCustomText] = createSignal("");
  const isActive = () => props.isActive ?? true;

  const optionCount = (): number => props.prompt.options.length;

  const handleSelect = (): void => {
    if (customMode()) {
      const text = customText().trim();
      if (text) {
        props.prompt.resolve({
          selectedLabels: [],
          customAnswer: text,
        });
      }
      return;
    }

    const selected = props.prompt.options[selectedIndex()];
    if (selected) {
      props.prompt.resolve({
        selectedLabels: [selected.label],
      });
    }
  };

  useKeyboard((evt) => {
    if (!isActive()) return;
    evt.stopPropagation();

    if (evt.name === "up") {
      if (!customMode()) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : optionCount() - 1));
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      if (!customMode()) {
        setSelectedIndex((i) => (i < optionCount() - 1 ? i + 1 : 0));
      }
      evt.preventDefault();
      return;
    }

    // Quick select by number (1-9)
    if (!customMode() && evt.name.length === 1 && evt.name >= "1" && evt.name <= "9") {
      const idx = parseInt(evt.name) - 1;
      if (idx < optionCount()) {
        setSelectedIndex(idx);
        handleSelect();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "return") {
      handleSelect();
      evt.preventDefault();
      return;
    }

    if (evt.name === "tab" && props.prompt.allowCustom) {
      setCustomMode((v) => !v);
      evt.preventDefault();
      return;
    }

    // Typing in custom mode
    if (customMode()) {
      if (evt.name === "backspace") {
        setCustomText((t) => t.slice(0, -1));
        evt.preventDefault();
      } else if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
        setCustomText((t) => t + evt.name);
        evt.preventDefault();
      }
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.primary}
      border={["top"]}
      backgroundColor={theme.colors.background}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width="100%"
      height="auto"
      flexShrink={0}
    >
      {/* Header */}
      <box marginBottom={1}>
        <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
          {props.prompt.question}
        </text>
      </box>

      {/* Options */}
      <box flexDirection="column">
        <For each={props.prompt.options}>
          {(option, index) => {
            const isSelected = (): boolean =>
              !customMode() && selectedIndex() === index();
            return (
              <box flexDirection="column">
                <box flexDirection="row">
                  <text
                    fg={isSelected() ? theme.colors.primary : theme.colors.textDim}
                    attributes={isSelected() ? TextAttributes.BOLD : undefined}
                  >
                    {isSelected() ? " > " : "   "}
                  </text>
                  <text
                    fg={isSelected() ? theme.colors.primary : theme.colors.text}
                    attributes={isSelected() ? TextAttributes.BOLD : undefined}
                  >
                    {`${index() + 1}. ${option.label}`}
                  </text>
                </box>
                <Show when={option.description}>
                  <text fg={theme.colors.textDim}>
                    {"     "}{option.description}
                  </text>
                </Show>
              </box>
            );
          }}
        </For>
      </box>

      {/* Custom answer */}
      <Show when={props.prompt.allowCustom}>
        <box marginTop={1} flexDirection="column">
          <text
            fg={customMode() ? theme.colors.primary : theme.colors.textDim}
            attributes={customMode() ? TextAttributes.BOLD : undefined}
          >
            {customMode() ? " > " : "   "}Type custom answer (Tab to toggle)
          </text>
          <Show when={customMode()}>
            <text fg={theme.colors.text}>
              {"     "}{customText()}{"\u2588"}
            </text>
          </Show>
        </box>
      </Show>

      {/* Footer */}
      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          {"\u2191\u2193 navigate  Enter select  1-9 quick pick"}
          {props.prompt.allowCustom ? "  Tab custom" : ""}
        </text>
      </box>
    </box>
  );
}
