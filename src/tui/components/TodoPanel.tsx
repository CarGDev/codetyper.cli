/**
 * TodoPanel Component - Shows agent-generated task plan
 *
 * Displays current plan with task status and progress
 */

import React from "react";
import { Box, Text } from "ink";
import { useTodoStore } from "@stores/todo-store";
import { useAppStore } from "@tui/store";
import type { TodoStatus } from "@/types/todo";

const STATUS_ICONS: Record<TodoStatus, string> = {
  pending: "○",
  in_progress: "◐",
  completed: "●",
  failed: "✗",
};

const STATUS_COLORS: Record<TodoStatus, string> = {
  pending: "gray",
  in_progress: "yellow",
  completed: "green",
  failed: "red",
};

export function TodoPanel(): React.ReactElement | null {
  const currentPlan = useTodoStore((state) => state.currentPlan);
  const todosVisible = useAppStore((state) => state.todosVisible);

  // Don't render if no plan or hidden
  if (!currentPlan || !todosVisible) {
    return null;
  }

  const { completed, total, percentage } = useTodoStore
    .getState()
    .getProgress();

  // Progress bar
  const barWidth = 20;
  const filledWidth = Math.round((percentage / 100) * barWidth);
  const progressBar =
    "█".repeat(filledWidth) + "░".repeat(barWidth - filledWidth);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="cyan" bold>
          📋 {currentPlan.title}
        </Text>
        <Text dimColor>
          {completed}/{total} ({percentage}%)
        </Text>
      </Box>

      {/* Progress bar */}
      <Box marginBottom={1}>
        <Text color="cyan">{progressBar}</Text>
      </Box>

      {/* Task list */}
      <Box flexDirection="column">
        {currentPlan.items.map((item, index) => {
          const icon = STATUS_ICONS[item.status];
          const color = STATUS_COLORS[item.status];
          const isActive = item.status === "in_progress";

          return (
            <Box key={item.id} flexDirection="column">
              <Box>
                <Text color={color}>{icon} </Text>
                <Text
                  color={isActive ? "white" : color}
                  bold={isActive}
                  dimColor={item.status === "completed"}
                >
                  {index + 1}. {item.title}
                </Text>
              </Box>
              {item.description && isActive && (
                <Box marginLeft={3}>
                  <Text dimColor>{item.description}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Footer hint */}
      <Box marginTop={1}>
        <Text dimColor>Ctrl+T to hide</Text>
      </Box>
    </Box>
  );
}
