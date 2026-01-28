import { createSignal, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";

interface AgentOption {
  id: string;
  name: string;
  description?: string;
}

interface AgentSelectProps {
  agents: AgentOption[];
  currentAgent: string;
  onSelect: (agentId: string) => void;
  onClose: () => void;
  isActive?: boolean;
}

export function AgentSelect(props: AgentSelectProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      const agent = props.agents[selectedIndex()];
      if (agent) {
        props.onSelect(agent.id);
        props.onClose();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : props.agents.length - 1,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) =>
        prev < props.agents.length - 1 ? prev + 1 : 0,
      );
      evt.preventDefault();
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.secondary}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
    >
      <box marginBottom={1}>
        <text fg={theme.colors.secondary} attributes={TextAttributes.BOLD}>
          Select Agent
        </text>
      </box>

      <box marginBottom={1} flexDirection="row">
        <text fg={theme.colors.textDim}>Current: </text>
        <text fg={theme.colors.primary}>{props.currentAgent}</text>
      </box>

      <For each={props.agents}>
        {(agent, index) => {
          const isSelected = () => index() === selectedIndex();
          const isCurrent = () => agent.id === props.currentAgent;

          return (
            <box flexDirection="row">
              <text
                fg={isSelected() ? theme.colors.secondary : undefined}
                attributes={
                  isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                }
              >
                {isSelected() ? "> " : "  "}
              </text>
              <text
                fg={isSelected() ? theme.colors.secondary : undefined}
                attributes={
                  isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                }
              >
                {agent.name}
              </text>
              <Show when={isCurrent()}>
                <text fg={theme.colors.success}> (current)</text>
              </Show>
              <Show when={agent.description}>
                <text fg={theme.colors.textDim}> - {agent.description}</text>
              </Show>
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
