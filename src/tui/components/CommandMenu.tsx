/**
 * CommandMenu Component - Slash command selection menu
 *
 * Shows when user types '/' and provides filterable command list
 */

import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useAppStore } from "@tui/store";
import type {
  SlashCommand,
  CommandMenuProps,
  CommandCategory,
} from "@/types/tui";
import { SLASH_COMMANDS, COMMAND_CATEGORIES } from "@constants/tui-components";

// Re-export for backwards compatibility
export { SLASH_COMMANDS } from "@constants/tui-components";

interface CommandWithIndex extends SlashCommand {
  flatIndex: number;
}

const filterCommands = (
  commands: readonly SlashCommand[],
  filter: string,
): SlashCommand[] => {
  if (!filter) return [...commands];
  const query = filter.toLowerCase();
  return commands.filter(
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

export function CommandMenu({
  onSelect,
  onCancel,
  isActive = true,
}: CommandMenuProps): React.ReactElement | null {
  const commandMenu = useAppStore((state) => state.commandMenu);
  const closeCommandMenu = useAppStore((state) => state.closeCommandMenu);
  const setCommandFilter = useAppStore((state) => state.setCommandFilter);
  const setCommandSelectedIndex = useAppStore(
    (state) => state.setCommandSelectedIndex,
  );

  // Filter commands based on input
  const filteredCommands = useMemo(
    () => filterCommands(SLASH_COMMANDS, commandMenu.filter),
    [commandMenu.filter],
  );

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!isActive || !commandMenu.isOpen) return;

      // Escape to close
      if (key.escape) {
        closeCommandMenu();
        onCancel?.();
        return;
      }

      // Enter to select
      if (key.return) {
        if (filteredCommands.length > 0) {
          const selected = filteredCommands[commandMenu.selectedIndex];
          if (selected) {
            // handleCommandSelect will close the menu
            onSelect(selected.name);
          }
        }
        return;
      }

      // Navigate up
      if (key.upArrow) {
        const newIndex =
          commandMenu.selectedIndex > 0
            ? commandMenu.selectedIndex - 1
            : filteredCommands.length - 1;
        setCommandSelectedIndex(newIndex);
        return;
      }

      // Navigate down
      if (key.downArrow) {
        const newIndex =
          commandMenu.selectedIndex < filteredCommands.length - 1
            ? commandMenu.selectedIndex + 1
            : 0;
        setCommandSelectedIndex(newIndex);
        return;
      }

      // Tab to complete/select
      if (key.tab) {
        if (filteredCommands.length > 0) {
          const selected = filteredCommands[commandMenu.selectedIndex];
          if (selected) {
            // handleCommandSelect will close the menu
            onSelect(selected.name);
          }
        }
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (commandMenu.filter.length > 0) {
          setCommandFilter(commandMenu.filter.slice(0, -1));
        } else {
          closeCommandMenu();
          onCancel?.();
        }
        return;
      }

      // Regular character input for filtering
      if (input && !key.ctrl && !key.meta) {
        setCommandFilter(commandMenu.filter + input);
      }
    },
    { isActive: isActive && commandMenu.isOpen },
  );

  if (!commandMenu.isOpen) return null;

  // Group commands by category
  const groupedCommands = groupCommandsByCategory(filteredCommands);

  // Calculate flat index for selection
  let flatIndex = 0;
  const commandsWithIndex: CommandWithIndex[] = groupedCommands.flatMap(
    (group) =>
      group.commands.map((cmd) => ({
        ...cmd,
        flatIndex: flatIndex++,
      })),
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
    >
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Commands
        </Text>
        {commandMenu.filter && <Text dimColor> - filtering: </Text>}
        {commandMenu.filter && <Text color="yellow">{commandMenu.filter}</Text>}
      </Box>

      {filteredCommands.length === 0 ? (
        <Text dimColor>No commands match "{commandMenu.filter}"</Text>
      ) : (
        <Box flexDirection="column">
          {groupedCommands.map((group) => (
            <Box key={group.category} flexDirection="column" marginBottom={1}>
              <Text dimColor bold>
                {capitalizeCategory(group.category)}
              </Text>
              {group.commands.map((cmd) => {
                const cmdWithIndex = commandsWithIndex.find(
                  (c) => c.name === cmd.name,
                );
                const isSelected =
                  cmdWithIndex?.flatIndex === commandMenu.selectedIndex;
                return (
                  <Box key={cmd.name}>
                    <Text
                      color={isSelected ? "cyan" : undefined}
                      bold={isSelected}
                    >
                      {isSelected ? "> " : "  "}
                    </Text>
                    <Text color={isSelected ? "cyan" : "green"}>
                      /{cmd.name}
                    </Text>
                    <Text dimColor> - {cmd.description}</Text>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          Esc to close | Enter/Tab to select | Type to filter
        </Text>
      </Box>
    </Box>
  );
}
