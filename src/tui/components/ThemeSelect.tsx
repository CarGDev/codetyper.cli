/**
 * ThemeSelect Component - Theme selection menu
 *
 * Shows available color themes for the TUI
 * Previews themes live as user navigates
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { useThemeStore, useThemeColors } from "@tui/hooks/useThemeStore";
import { THEMES } from "@constants/themes";

interface ThemeSelectProps {
  onSelect: (theme: string) => void;
  onClose: () => void;
  isActive?: boolean;
}

export function ThemeSelect({
  onSelect,
  onClose,
  isActive = true,
}: ThemeSelectProps): React.ReactElement {
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState("");

  // Store the original theme to revert on cancel
  const originalTheme = useRef<string>(currentTheme);

  const allThemes = useMemo(() => {
    return Object.values(THEMES).map((theme) => ({
      name: theme.name,
      displayName: theme.displayName,
      colors: theme.colors,
    }));
  }, []);

  const filteredThemes = useMemo(() => {
    if (!filter) return allThemes;
    const query = filter.toLowerCase();
    return allThemes.filter(
      (theme) =>
        theme.name.toLowerCase().includes(query) ||
        theme.displayName.toLowerCase().includes(query),
    );
  }, [allThemes, filter]);

  // Preview theme as user navigates
  useEffect(() => {
    if (filteredThemes.length > 0 && filteredThemes[selectedIndex]) {
      const previewTheme = filteredThemes[selectedIndex].name;
      setTheme(previewTheme);
    }
  }, [selectedIndex, filteredThemes, setTheme]);

  // Store original theme on mount
  useEffect(() => {
    originalTheme.current = currentTheme;
  }, []);

  const handleCancel = () => {
    // Revert to original theme
    setTheme(originalTheme.current);
    onClose();
  };

  const handleConfirm = () => {
    if (filteredThemes.length > 0) {
      const selected = filteredThemes[selectedIndex];
      if (selected) {
        // Theme is already applied via preview, just confirm it
        onSelect(selected.name);
        onClose();
      }
    }
  };

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.escape) {
        handleCancel();
        return;
      }

      if (key.return) {
        handleConfirm();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredThemes.length - 1,
        );
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) =>
          prev < filteredThemes.length - 1 ? prev + 1 : 0,
        );
        return;
      }

      if (key.backspace || key.delete) {
        if (filter.length > 0) {
          setFilter(filter.slice(0, -1));
          setSelectedIndex(0);
        }
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setFilter(filter + input);
        setSelectedIndex(0);
      }
    },
    { isActive },
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.borderModal}
      paddingX={1}
      paddingY={0}
    >
      <Box marginBottom={1}>
        <Text color={colors.accent} bold>
          Select Theme
        </Text>
        {filter && (
          <>
            <Text dimColor> - filtering: </Text>
            <Text color={colors.warning}>{filter}</Text>
          </>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Original: </Text>
        <Text color={colors.primary}>
          {THEMES[originalTheme.current]?.displayName ?? originalTheme.current}
        </Text>
        <Text dimColor> → Preview: </Text>
        <Text color={colors.accent} bold>
          {THEMES[currentTheme]?.displayName ?? currentTheme}
        </Text>
      </Box>

      {filteredThemes.length === 0 ? (
        <Text dimColor>No themes match "{filter}"</Text>
      ) : (
        <Box flexDirection="column">
          {filteredThemes.map((theme, index) => {
            const isSelected = index === selectedIndex;
            const isOriginal = theme.name === originalTheme.current;

            return (
              <Box key={theme.name}>
                <Text
                  color={isSelected ? colors.accent : undefined}
                  bold={isSelected}
                >
                  {isSelected ? "> " : "  "}
                </Text>
                <Text
                  color={isSelected ? colors.accent : undefined}
                  bold={isSelected}
                >
                  {theme.displayName}
                </Text>
                {isOriginal && <Text color={colors.success}> (original)</Text>}
                <Text dimColor> </Text>
                {/* Color preview squares */}
                <Text color={theme.colors.primary}>●</Text>
                <Text color={theme.colors.success}>●</Text>
                <Text color={theme.colors.warning}>●</Text>
                <Text color={theme.colors.error}>●</Text>
                <Text color={theme.colors.accent}>●</Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ live preview | Enter confirm | Type to filter | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
