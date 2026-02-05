import { Show, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { getTopicById } from "@/constants/help-content";

interface HelpDetailProps {
  topicId: string;
  onBack: () => void;
  onClose: () => void;
  isActive?: boolean;
}

export function HelpDetail(props: HelpDetailProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;

  const topic = () => getTopicById(props.topicId);

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape" || evt.name === "backspace" || evt.name === "q") {
      props.onBack();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  const currentTopic = topic();

  if (!currentTopic) {
    return (
      <box
        flexDirection="column"
        borderColor={theme.colors.error}
        border={["top", "bottom", "left", "right"]}
        backgroundColor={theme.colors.background}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
      >
        <text fg={theme.colors.error}>Topic not found</text>
        <text fg={theme.colors.textDim}>Press Esc to go back</text>
      </box>
    );
  }

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
      <text fg={theme.colors.info} attributes={TextAttributes.BOLD}>
        {currentTopic.name}
      </text>

      <box height={1} />

      <text fg={theme.colors.text}>{currentTopic.fullDescription}</text>

      <Show when={currentTopic.usage}>
        <box height={1} />
        <text fg={theme.colors.warning} attributes={TextAttributes.BOLD}>
          Usage
        </text>
        <text fg={theme.colors.success}> {currentTopic.usage}</text>
      </Show>

      <Show when={currentTopic.examples && currentTopic.examples.length > 0}>
        <box height={1} />
        <text fg={theme.colors.warning} attributes={TextAttributes.BOLD}>
          Examples
        </text>
        <For each={currentTopic.examples}>
          {(example) => <text fg={theme.colors.text}> • {example}</text>}
        </For>
      </Show>

      <Show when={currentTopic.shortcuts && currentTopic.shortcuts.length > 0}>
        <box height={1} />
        <text fg={theme.colors.warning} attributes={TextAttributes.BOLD}>
          Shortcuts
        </text>
        <For each={currentTopic.shortcuts}>
          {(shortcut) => <text fg={theme.colors.primary}> {shortcut}</text>}
        </For>
      </Show>

      <box height={1} />

      <text fg={theme.colors.textDim}>Esc/Backspace back | Enter close</text>
    </box>
  );
}
