import { createSignal, createMemo, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import {
  HELP_CATEGORIES,
  getTopicsByCategory,
  type HelpCategory,
} from "@/constants/help-content";

interface HelpMenuProps {
  onSelectTopic: (topicId: string) => void;
  onClose: () => void;
  isActive?: boolean;
}

interface TopicItem {
  id: string;
  name: string;
  description: string;
}

interface CategoryGroup {
  category: HelpCategory;
  categoryName: string;
  topics: TopicItem[];
}

export function HelpMenu(props: HelpMenuProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;

  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const groupedTopics = createMemo((): CategoryGroup[] => {
    return HELP_CATEGORIES.map((cat) => ({
      category: cat.id,
      categoryName: cat.name,
      topics: getTopicsByCategory(cat.id).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.shortDescription,
      })),
    })).filter((g) => g.topics.length > 0);
  });

  const allTopics = createMemo((): TopicItem[] => {
    return groupedTopics().flatMap((g) => g.topics);
  });

  const selectedTopic = createMemo(() => {
    const topics = allTopics();
    const idx = Math.min(selectedIndex(), topics.length - 1);
    return topics[idx];
  });

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      const topic = selectedTopic();
      if (topic) {
        props.onSelectTopic(topic.id);
      }
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "up") {
      const total = allTopics().length;
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "down") {
      const total = allTopics().length;
      setSelectedIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  const isTopicSelected = (topicId: string): boolean => {
    return selectedTopic()?.id === topicId;
  };

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.info}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
    >
      <box marginBottom={1}>
        <text fg={theme.colors.info} attributes={TextAttributes.BOLD}>
          Help - Select a topic
        </text>
      </box>

      <For each={groupedTopics()}>
        {(group) => (
          <box flexDirection="column" marginBottom={1}>
            <box>
              <text fg={theme.colors.warning} attributes={TextAttributes.BOLD}>
                {group.categoryName}
              </text>
            </box>
            <For each={group.topics}>
              {(topic) => {
                const selected = () => isTopicSelected(topic.id);
                return (
                  <box flexDirection="row">
                    <text
                      fg={selected() ? theme.colors.primary : theme.colors.text}
                      attributes={
                        selected() ? TextAttributes.BOLD : TextAttributes.NONE
                      }
                    >
                      {selected() ? "> " : "  "}
                    </text>
                    <text
                      fg={
                        selected() ? theme.colors.primary : theme.colors.success
                      }
                    >
                      {topic.name.padEnd(14).substring(0, 14)}
                    </text>
                    <text fg={theme.colors.textDim}>
                      {" "}
                      {topic.description.substring(0, 40)}
                    </text>
                  </box>
                );
              }}
            </For>
          </box>
        )}
      </For>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter details | Esc close
        </text>
      </box>
    </box>
  );
}
