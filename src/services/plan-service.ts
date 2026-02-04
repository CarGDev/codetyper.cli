/**
 * Plan Service - Manages agent-generated task plans
 *
 * Provides functions for agents to create and update plans
 */

import { todoStore } from "@stores/core/todo-store";
import type { TodoStatus } from "@/types/todo";

/**
 * Create a new plan with tasks
 */
export const createPlan = (
  title: string,
  tasks: Array<{ title: string; description?: string }>,
): string => {
  return todoStore.createPlan(title, tasks);
};

/**
 * Add a task to the current plan
 */
export const addTask = (title: string, description?: string): string | null => {
  return todoStore.addItem(title, description);
};

/**
 * Mark the current task as completed and move to next
 */
export const completeCurrentTask = (): void => {
  const current = todoStore.getCurrentItem();
  if (current) {
    todoStore.updateItemStatus(current.id, "completed");
  }
};

/**
 * Mark a specific task as completed
 */
export const completeTask = (taskId: string): void => {
  todoStore.updateItemStatus(taskId, "completed");
};

/**
 * Mark a task as failed
 */
export const failTask = (taskId: string): void => {
  todoStore.updateItemStatus(taskId, "failed");
};

/**
 * Update task status
 */
export const updateTaskStatus = (taskId: string, status: TodoStatus): void => {
  todoStore.updateItemStatus(taskId, status);
};

/**
 * Clear the current plan
 */
export const clearPlan = (): void => {
  todoStore.clearPlan();
};

/**
 * Check if there's an active plan
 */
export const hasPlan = (): boolean => {
  return todoStore.hasPlan();
};

/**
 * Get the current task being worked on
 */
export const getCurrentTask = () => {
  return todoStore.getCurrentItem();
};

/**
 * Get plan progress
 */
export const getProgress = () => {
  return todoStore.getProgress();
};

/**
 * Get the full current plan
 */
export const getPlan = () => {
  return todoStore.getPlan();
};

/**
 * Parse a plan from agent response text
 * Looks for numbered lists or task patterns
 */
export const parsePlanFromText = (
  text: string,
): Array<{ title: string; description?: string }> | null => {
  const tasks: Array<{ title: string; description?: string }> = [];

  // Pattern 1: Numbered list (1. Task, 2. Task, etc.)
  const numberedPattern = /^\s*(\d+)\.\s+(.+)$/gm;
  let match;

  while ((match = numberedPattern.exec(text)) !== null) {
    tasks.push({ title: match[2].trim() });
  }

  if (tasks.length > 0) {
    return tasks;
  }

  // Pattern 2: Checkbox list (- [ ] Task, - [x] Task)
  const checkboxPattern = /^\s*-\s*\[[ x]\]\s+(.+)$/gm;

  while ((match = checkboxPattern.exec(text)) !== null) {
    tasks.push({ title: match[1].trim() });
  }

  if (tasks.length > 0) {
    return tasks;
  }

  // Pattern 3: Bullet list with "Step" or "Task" keywords
  const stepPattern = /^\s*[-*]\s*(Step|Task)\s*\d*:?\s*(.+)$/gim;

  while ((match = stepPattern.exec(text)) !== null) {
    tasks.push({ title: match[2].trim() });
  }

  return tasks.length > 0 ? tasks : null;
};

/**
 * Detect if text contains a plan
 */
export const detectPlan = (text: string): boolean => {
  const planKeywords = [
    /here'?s? (my |the |a )?plan/i,
    /i'?ll? (do|perform|execute) the following/i,
    /steps? to (complete|accomplish|do)/i,
    /let me (outline|break down)/i,
    /the (plan|approach|strategy) is/i,
  ];

  return planKeywords.some((pattern) => pattern.test(text));
};
