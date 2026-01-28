/**
 * ModelSelect Component - Model selection menu
 *
 * Shows available models with "auto" option like VSCode Copilot
 * Displays cost multiplier for each model (0.0x = unlimited, 1.0x = standard, etc.)
 */

import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useAppStore } from "@tui/store";
import type { ProviderModel } from "@/types/providers";

interface ModelSelectProps {
  onSelect: (model: string) => void;
  onClose: () => void;
  isActive?: boolean;
}

const MAX_VISIBLE = 10;

// Auto model option
const AUTO_MODEL: ProviderModel = {
  id: "auto",
  name: "Auto",
  supportsTools: true,
  supportsStreaming: true,
  costMultiplier: undefined,
  isUnlimited: true,
};

const formatCostMultiplier = (model: ProviderModel): string => {
  if (model.id === "auto") return "";

  const multiplier = model.costMultiplier;
  if (multiplier === undefined) {
    return "";
  }
  if (multiplier === 0 || model.isUnlimited) {
    return "Unlimited";
  }
  return `${multiplier}x`;
};

const getCostColor = (model: ProviderModel): string | undefined => {
  if (model.id === "auto") return undefined;

  const multiplier = model.costMultiplier;
  if (multiplier === undefined) {
    return "gray";
  }
  if (multiplier === 0 || model.isUnlimited) {
    return "green";
  }
  if (multiplier <= 0.1) {
    return "cyan";
  }
  if (multiplier <= 1.0) {
    return "yellow";
  }
  return "red";
};

export function ModelSelect({
  onSelect,
  onClose,
  isActive = true,
}: ModelSelectProps): React.ReactElement {
  const availableModels = useAppStore((state) => state.availableModels);
  const currentModel = useAppStore((state) => state.model);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [filter, setFilter] = useState("");

  // Add "auto" option at the beginning
  const allModels = useMemo((): ProviderModel[] => {
    return [AUTO_MODEL, ...availableModels];
  }, [availableModels]);

  // Filter models based on input
  const filteredModels = useMemo((): ProviderModel[] => {
    if (!filter) return allModels;
    const query = filter.toLowerCase();
    return allModels.filter(
      (model) =>
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query),
    );
  }, [allModels, filter]);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Escape to close
      if (key.escape) {
        onClose();
        return;
      }

      // Enter to select
      if (key.return) {
        if (filteredModels.length > 0) {
          const selected = filteredModels[selectedIndex];
          if (selected) {
            onSelect(selected.id);
            onClose();
          }
        }
        return;
      }

      // Navigate up
      if (key.upArrow) {
        setSelectedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : filteredModels.length - 1;
          // Scroll up if needed
          if (newIndex < scrollOffset) {
            setScrollOffset(newIndex);
          }
          // Jump to bottom - scroll to show bottom items
          if (prev === 0 && newIndex === filteredModels.length - 1) {
            setScrollOffset(Math.max(0, filteredModels.length - MAX_VISIBLE));
          }
          return newIndex;
        });
        return;
      }

      // Navigate down
      if (key.downArrow) {
        setSelectedIndex((prev) => {
          const newIndex = prev < filteredModels.length - 1 ? prev + 1 : 0;
          // Scroll down if needed
          if (newIndex >= scrollOffset + MAX_VISIBLE) {
            setScrollOffset(newIndex - MAX_VISIBLE + 1);
          }
          // Jump to top - scroll to top
          if (prev === filteredModels.length - 1 && newIndex === 0) {
            setScrollOffset(0);
          }
          return newIndex;
        });
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (filter.length > 0) {
          setFilter(filter.slice(0, -1));
          setSelectedIndex(0);
          setScrollOffset(0);
        }
        return;
      }

      // Regular character input for filtering
      if (input && !key.ctrl && !key.meta) {
        setFilter(filter + input);
        setSelectedIndex(0);
        setScrollOffset(0);
      }
    },
    { isActive },
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={1}
      paddingY={0}
    >
      <Box marginBottom={1}>
        <Text color="magenta" bold>
          Select Model
        </Text>
        {filter && (
          <>
            <Text dimColor> - filtering: </Text>
            <Text color="yellow">{filter}</Text>
          </>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Current: </Text>
        <Text color="cyan">{currentModel}</Text>
      </Box>

      {filteredModels.length === 0 ? (
        <Text dimColor>No models match "{filter}"</Text>
      ) : (
        <Box flexDirection="column">
          {/* Scroll up indicator */}
          {scrollOffset > 0 && (
            <Text dimColor> ↑ {scrollOffset} more above</Text>
          )}

          {/* Visible models */}
          {filteredModels
            .slice(scrollOffset, scrollOffset + MAX_VISIBLE)
            .map((model, visibleIndex) => {
              const actualIndex = scrollOffset + visibleIndex;
              const isSelected = actualIndex === selectedIndex;
              const isCurrent = model.id === currentModel;
              const isAuto = model.id === "auto";
              const costLabel = formatCostMultiplier(model);
              const costColor = getCostColor(model);
              return (
                <Box key={model.id}>
                  <Text
                    color={isSelected ? "magenta" : undefined}
                    bold={isSelected}
                  >
                    {isSelected ? "> " : "  "}
                  </Text>
                  <Text
                    color={
                      isAuto ? "yellow" : isSelected ? "magenta" : undefined
                    }
                    bold={isSelected || isAuto}
                  >
                    {model.id}
                  </Text>
                  {costLabel && !isAuto && (
                    <Text color={costColor}> [{costLabel}]</Text>
                  )}
                  {isCurrent && <Text color="green"> (current)</Text>}
                  {isAuto && (
                    <Text dimColor> - Let Copilot choose the best model</Text>
                  )}
                </Box>
              );
            })}

          {/* Scroll down indicator */}
          {scrollOffset + MAX_VISIBLE < filteredModels.length && (
            <Text dimColor>
              {" "}
              ↓ {filteredModels.length - scrollOffset - MAX_VISIBLE} more below
            </Text>
          )}
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text dimColor>Cost: </Text>
          <Text color="green">Unlimited</Text>
          <Text dimColor> | </Text>
          <Text color="cyan">Low</Text>
          <Text dimColor> | </Text>
          <Text color="yellow">Standard</Text>
          <Text dimColor> | </Text>
          <Text color="red">Premium</Text>
        </Box>
        <Text dimColor>
          ↑↓ navigate | Enter select | Type to filter | Esc close
        </Text>
      </Box>
    </Box>
  );
}
