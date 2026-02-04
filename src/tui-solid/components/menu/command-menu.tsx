import { createMemo, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { BRAIN_DISABLED } from "@constants/brain";
import type { SlashCommand, CommandCategory } from "@/types/tui";
import { SLASH_COMMANDS, COMMAND_CATEGORIES } from "@constants/tui-components";

export { SLASH_COMMANDS } from "@constants/tui-components";

interface CommandMenuProps {
  onSelect: (command: string) => void;
  onCancel?: () => void;
  isActive?: boolean;
}

interface CommandWithIndex extends SlashCommand {
  flatIndex: number;
}

const filterCommands = (
  commands: readonly SlashCommand[],
  filter: string,
): SlashCommand[] => {
  // Filter out brain command when Brain is disabled
  let availableCommands = BRAIN_DISABLED
    ? commands.filter((cmd) => cmd.name !== "brain")
    : [...commands];

  if (!filter) return availableCommands;
  const query = filter.toLowerCase();
  return availableCommands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query),
  );
};

const groupCommandsByCategory = (
  commands: SlashCommand[],
): Array<{ category: CommandCategory; commands: SlashCommand[] }> => {
  return COMMAND_CATEGORIES.map((cat) => ({
    category: cat,
    commands: commands.filter((cmd) => cmd.category === cat),
  })).filter((group) => group.commands.length > 0);
};

const capitalizeCategory = (category: string): string =>
  category.charAt(0).toUpperCase() + category.slice(1);

export function CommandMenu(props: CommandMenuProps) {
  const theme = useTheme();
  const app = useAppStore();
  const isActive = () => props.isActive ?? true;

  const filteredCommands = createMemo(() =>
    filterCommands(SLASH_COMMANDS, app.commandMenu().filter),
  );

  const groupedCommands = createMemo(() =>
    groupCommandsByCategory(filteredCommands()),
  );

  const commandsWithIndex = createMemo((): CommandWithIndex[] => {
    let flatIndex = 0;
    return groupedCommands().flatMap((group) =>
      group.commands.map((cmd) => ({
        ...cmd,
        flatIndex: flatIndex++,
      })),
    );
  });

  useKeyboard((evt) => {
    if (!isActive() || !app.commandMenu().isOpen) return;

    if (evt.name === "escape") {
      app.closeCommandMenu();
      props.onCancel?.();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      const commands = filteredCommands();
      if (commands.length > 0) {
        const selected = commands[app.commandMenu().selectedIndex];
        if (selected) {
          props.onSelect(selected.name);
        }
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      const newIndex =
        app.commandMenu().selectedIndex > 0
          ? app.commandMenu().selectedIndex - 1
          : filteredCommands().length - 1;
      app.setCommandSelectedIndex(newIndex);
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      const newIndex =
        app.commandMenu().selectedIndex < filteredCommands().length - 1
          ? app.commandMenu().selectedIndex + 1
          : 0;
      app.setCommandSelectedIndex(newIndex);
      evt.preventDefault();
      return;
    }

    if (evt.name === "tab") {
      const commands = filteredCommands();
      if (commands.length > 0) {
        const selected = commands[app.commandMenu().selectedIndex];
        if (selected) {
          props.onSelect(selected.name);
        }
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "backspace" || evt.name === "delete") {
      if (app.commandMenu().filter.length > 0) {
        app.setCommandFilter(app.commandMenu().filter.slice(0, -1));
      } else {
        app.closeCommandMenu();
        props.onCancel?.();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      app.setCommandFilter(app.commandMenu().filter + evt.name);
      evt.preventDefault();
    }
  });

  return (
    <Show when={app.commandMenu().isOpen}>
      <box
        flexDirection="column"
        borderColor={theme.colors.primary}
        border={["top", "bottom", "left", "right"]}
        backgroundColor={theme.colors.background}
        paddingLeft={1}
        paddingRight={1}
      >
        <box marginBottom={1} flexDirection="row">
          <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
            Commands
          </text>
          <Show when={app.commandMenu().filter}>
            <text fg={theme.colors.textDim}> - filtering: </text>
            <text fg={theme.colors.warning}>{app.commandMenu().filter}</text>
          </Show>
        </box>

        <Show
          when={filteredCommands().length > 0}
          fallback={
            <text fg={theme.colors.textDim}>
              No commands match "{app.commandMenu().filter}"
            </text>
          }
        >
          <box flexDirection="column">
            <For each={groupedCommands()}>
              {(group) => (
                <box flexDirection="column" marginBottom={1}>
                  <text
                    fg={theme.colors.textDim}
                    attributes={TextAttributes.BOLD}
                  >
                    {capitalizeCategory(group.category)}
                  </text>
                  <For each={group.commands}>
                    {(cmd) => {
                      const cmdWithIndex = () =>
                        commandsWithIndex().find((c) => c.name === cmd.name);
                      const isSelected = () =>
                        cmdWithIndex()?.flatIndex ===
                        app.commandMenu().selectedIndex;

                      return (
                        <box flexDirection="row">
                          <text
                            fg={isSelected() ? theme.colors.primary : undefined}
                            attributes={
                              isSelected()
                                ? TextAttributes.BOLD
                                : TextAttributes.NONE
                            }
                          >
                            {isSelected() ? "> " : "  "}
                          </text>
                          <text
                            fg={
                              isSelected()
                                ? theme.colors.primary
                                : theme.colors.success
                            }
                          >
                            /{cmd.name}
                          </text>
                          <text fg={theme.colors.textDim}>
                            {" "}
                            - {cmd.description}
                          </text>
                        </box>
                      );
                    }}
                  </For>
                </box>
              )}
            </For>
          </box>
        </Show>

        <box marginTop={1}>
          <text fg={theme.colors.textDim}>
            Esc to close | Enter/Tab to select | Type to filter
          </text>
        </box>
      </box>
    </Show>
  );
}
