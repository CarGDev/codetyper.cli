/**
 * TodoPanel Component - Shows agent-generated task plan as a right-side pane
 *
 * Displays current plan with task status and progress in Claude Code style:
 * - Spinner with current task title, duration, and tokens
 * - ✓ with strikethrough for completed tasks
 * - ■ for in_progress tasks
 * - □ for pending tasks
 * - Collapsible completed tasks view
 */

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { useTodoStore } from "@tui/hooks/useTodoStore";
import { useAppStore } from "@tui/store";
import type { TodoItem, TodoStatus } from "@/types/todo";

const STATUS_ICONS: Record<TodoStatus, string> = {
  pending: "□",
  in_progress: "■",
  completed: "✓",
  failed: "✗",
};

const STATUS_COLORS: Record<TodoStatus, string> = {
  pending: "white",
  in_progress: "yellow",
  completed: "green",
  failed: "red",
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const MAX_VISIBLE_COMPLETED = 3;
const PANEL_WIDTH = 50;

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const formatTokens = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
};

interface TaskItemProps {
  item: TodoItem;
  isLast: boolean;
}

const TaskItem = ({ item, isLast }: TaskItemProps): React.ReactElement => {
  const icon = STATUS_ICONS[item.status];
  const color = STATUS_COLORS[item.status];
  const isCompleted = item.status === "completed";
  const isInProgress = item.status === "in_progress";

  // Tree connector: L for last item, ├ for other items
  const connector = isLast ? "└" : "├";

  return (
    <Box>
      <Text dimColor>{connector}─ </Text>
      <Text color={color}>{icon} </Text>
      <Text
        color={isInProgress ? "white" : color}
        bold={isInProgress}
        strikethrough={isCompleted}
        dimColor={isCompleted}
      >
        {item.title}
      </Text>
    </Box>
  );
};

export function TodoPanel(): React.ReactElement | null {
  const currentPlan = useTodoStore((state) => state.currentPlan);
  const todosVisible = useAppStore((state) => state.todosVisible);
  const sessionStats = useAppStore((state) => state.sessionStats);

  // Spinner animation
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  // Elapsed time tracking
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!currentPlan) return;

    const timer = setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % SPINNER_FRAMES.length);
      setElapsed(Date.now() - currentPlan.createdAt);
    }, 100);

    return () => clearInterval(timer);
  }, [currentPlan]);

  // Don't render if no plan or hidden
  if (!currentPlan || !todosVisible) {
    return null;
  }

  const { completed, total } = useTodoStore.getState().getProgress();
  const totalTokens = sessionStats.inputTokens + sessionStats.outputTokens;

  // Get current in_progress task
  const currentTask = currentPlan.items.find(
    (item) => item.status === "in_progress",
  );

  // Separate tasks by status
  const completedTasks = currentPlan.items.filter(
    (item) => item.status === "completed",
  );
  const pendingTasks = currentPlan.items.filter(
    (item) => item.status === "pending",
  );
  const inProgressTasks = currentPlan.items.filter(
    (item) => item.status === "in_progress",
  );
  const failedTasks = currentPlan.items.filter(
    (item) => item.status === "failed",
  );

  // Determine which completed tasks to show (most recent)
  const visibleCompletedTasks = completedTasks.slice(-MAX_VISIBLE_COMPLETED);
  const hiddenCompletedCount = Math.max(
    0,
    completedTasks.length - MAX_VISIBLE_COMPLETED,
  );

  // Build task list in display order:
  // 1. Visible completed tasks (oldest of the visible first)
  // 2. In-progress task (current)
  // 3. Pending tasks
  // 4. Failed tasks
  const displayTasks = [
    ...visibleCompletedTasks,
    ...inProgressTasks,
    ...pendingTasks,
    ...failedTasks,
  ];

  return (
    <Box
      flexDirection="column"
      width={PANEL_WIDTH}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      {/* Header with spinner, task name, duration, and tokens */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="magenta">{SPINNER_FRAMES[spinnerFrame]} </Text>
          <Text color="white" bold>
            {currentTask?.title ?? currentPlan.title}
          </Text>
        </Box>
        <Box>
          <Text dimColor>
            ({formatDuration(elapsed)} · ↓ {formatTokens(totalTokens)} tokens)
          </Text>
        </Box>
      </Box>

      {/* Task list with tree connectors */}
      <Box flexDirection="column">
        {displayTasks.map((item, index) => (
          <TaskItem
            key={item.id}
            item={item}
            isLast={index === displayTasks.length - 1 && hiddenCompletedCount === 0}
          />
        ))}

        {/* Hidden completed tasks summary */}
        {hiddenCompletedCount > 0 && (
          <Box>
            <Text dimColor>└─ ... +{hiddenCompletedCount} completed</Text>
          </Box>
        )}
      </Box>

      {/* Footer with progress */}
      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>
          {completed}/{total} tasks
        </Text>
        <Text dimColor>Ctrl+T to hide</Text>
      </Box>
    </Box>
  );
}
