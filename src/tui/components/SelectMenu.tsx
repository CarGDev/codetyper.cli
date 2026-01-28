/**
 * SelectMenu Component - Keyboard navigable selection menu
 *
 * - Up/Down arrows to navigate
 * - Enter to select
 * - Optional shortcut keys for quick selection
 */

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { SelectOption } from "@/types/tui";

// Re-export type for backwards compatibility
export type { SelectOption } from "@/types/tui";

interface SelectMenuProps {
  options: SelectOption[];
  onSelect: (option: SelectOption) => void;
  title?: string;
  initialIndex?: number;
  isActive?: boolean;
}

export function SelectMenu({
  options,
  onSelect,
  title,
  initialIndex = 0,
  isActive = true,
}: SelectMenuProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Navigate with arrow keys
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        return;
      }

      // Select with Enter
      if (key.return) {
        onSelect(options[selectedIndex]);
        return;
      }

      // Quick select with shortcut key
      const lowerInput = input.toLowerCase();
      const optionIndex = options.findIndex(
        (o) => o.key?.toLowerCase() === lowerInput,
      );
      if (optionIndex !== -1) {
        onSelect(options[optionIndex]);
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="yellow">
            {title}
          </Text>
        </Box>
      )}

      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={option.value}>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {isSelected ? "❯ " : "  "}
            </Text>
            {option.key && (
              <Text color={isSelected ? "cyan" : "gray"}>[{option.key}] </Text>
            )}
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {option.label}
            </Text>
            {option.description && (
              <Text dimColor> - {option.description}</Text>
            )}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text dimColor>↑↓ to navigate • Enter to select</Text>
        {options.some((o) => o.key) && (
          <Text dimColor> • or press shortcut key</Text>
        )}
      </Box>
    </Box>
  );
}
