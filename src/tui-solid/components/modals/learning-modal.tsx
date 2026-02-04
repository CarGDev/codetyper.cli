import { createSignal, Show, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { LearningPrompt, LearningScope } from "@/types/tui";

interface LearningModalProps {
  prompt: LearningPrompt;
  onRespond?: (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ) => void;
  isActive?: boolean;
}

const SCOPE_OPTIONS: Array<{
  key: string;
  label: string;
  scope: LearningScope;
}> = [
  { key: "l", label: "Save for this project", scope: "local" },
  { key: "g", label: "Save globally", scope: "global" },
];

export function LearningModal(props: LearningModalProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [isEditing, setIsEditing] = createSignal(false);
  const [editedContent] = createSignal(props.prompt.content);
  const isActive = () => props.isActive ?? true;

  const handleResponse = (
    save: boolean,
    scope?: LearningScope,
    content?: string,
  ): void => {
    // Call the resolve function on the prompt to complete the learning prompt
    if (props.prompt.resolve) {
      props.prompt.resolve({ save, scope, editedContent: content });
    }
    // Also call the onRespond callback for UI state updates
    props.onRespond?.(save, scope, content);
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    // Stop propagation for all events when modal is active
    evt.stopPropagation();

    if (isEditing()) {
      if (evt.name === "escape") {
        setIsEditing(false);
        evt.preventDefault();
        return;
      }
      if (evt.name === "return" && evt.ctrl) {
        setIsEditing(false);
        evt.preventDefault();
        return;
      }
      return;
    }

    if (evt.name === "up") {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : SCOPE_OPTIONS.length + 1,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) =>
        prev < SCOPE_OPTIONS.length + 1 ? prev + 1 : 0,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "return") {
      if (selectedIndex() === SCOPE_OPTIONS.length) {
        setIsEditing(true);
      } else if (selectedIndex() === SCOPE_OPTIONS.length + 1) {
        handleResponse(false);
      } else {
        const option = SCOPE_OPTIONS[selectedIndex()];
        handleResponse(true, option.scope, editedContent());
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "escape") {
      handleResponse(false);
      evt.preventDefault();
      return;
    }

    // Only handle known shortcut keys to avoid accidental triggers
    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      const charLower = evt.name.toLowerCase();
      const optionIndex = SCOPE_OPTIONS.findIndex((o) => o.key === charLower);
      if (optionIndex !== -1) {
        const option = SCOPE_OPTIONS[optionIndex];
        handleResponse(true, option.scope, editedContent());
        evt.preventDefault();
        return;
      }
      if (charLower === "e") {
        setIsEditing(true);
        evt.preventDefault();
        return;
      }
      if (charLower === "n") {
        handleResponse(false);
        evt.preventDefault();
      }
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.info}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
    >
      <box marginBottom={1}>
        <text fg={theme.colors.info} attributes={TextAttributes.BOLD}>
          💡 Learning Opportunity
        </text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg={theme.colors.textDim}>Category: </text>
        <text fg={theme.colors.primary}>{props.prompt.category}</text>
      </box>

      <Show when={props.prompt.context}>
        <box flexDirection="column" marginBottom={1}>
          <text fg={theme.colors.textDim}>Context: </text>
          <text fg={theme.colors.text}>{props.prompt.context}</text>
        </box>
      </Show>

      <box flexDirection="column" marginBottom={1}>
        <text fg={theme.colors.textDim}>Learned content:</text>
        <box
          marginTop={1}
          borderColor={isEditing() ? theme.colors.primary : theme.colors.border}
          border={["top", "bottom", "left", "right"]}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg={theme.colors.text} wrapMode="word">
            {editedContent()}
          </text>
        </box>
      </box>

      <box flexDirection="column" marginTop={1}>
        <For each={SCOPE_OPTIONS}>
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
                  {isSelected() ? "> " : "  "}
                </text>
                <text fg={theme.colors.success}>[{option.key}] </text>
                <text fg={isSelected() ? theme.colors.primary : undefined}>
                  {option.label}
                </text>
              </box>
            );
          }}
        </For>

        <box flexDirection="row">
          <text
            fg={
              selectedIndex() === SCOPE_OPTIONS.length
                ? theme.colors.primary
                : undefined
            }
            attributes={
              selectedIndex() === SCOPE_OPTIONS.length
                ? TextAttributes.BOLD
                : TextAttributes.NONE
            }
          >
            {selectedIndex() === SCOPE_OPTIONS.length ? "> " : "  "}
          </text>
          <text fg={theme.colors.warning}>[e] </text>
          <text
            fg={
              selectedIndex() === SCOPE_OPTIONS.length
                ? theme.colors.primary
                : undefined
            }
          >
            Edit before saving
          </text>
        </box>

        <box flexDirection="row">
          <text
            fg={
              selectedIndex() === SCOPE_OPTIONS.length + 1
                ? theme.colors.primary
                : undefined
            }
            attributes={
              selectedIndex() === SCOPE_OPTIONS.length + 1
                ? TextAttributes.BOLD
                : TextAttributes.NONE
            }
          >
            {selectedIndex() === SCOPE_OPTIONS.length + 1 ? "> " : "  "}
          </text>
          <text fg={theme.colors.error}>[n] </text>
          <text
            fg={
              selectedIndex() === SCOPE_OPTIONS.length + 1
                ? theme.colors.primary
                : undefined
            }
          >
            Don't save
          </text>
        </box>
      </box>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Press shortcut key
        </text>
      </box>
    </box>
  );
}
