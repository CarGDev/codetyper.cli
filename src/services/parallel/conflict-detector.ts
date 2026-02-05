/**
 * Conflict Detector
 *
 * Detects conflicts between parallel tasks based on file paths
 * and task types. Read-only tasks don't conflict with each other.
 */

import {
  CONFLICT_CONFIG,
  READ_ONLY_TASK_TYPES,
  MODIFYING_TASK_TYPES,
} from "@constants/parallel";
import type {
  ParallelTask,
  ConflictCheckResult,
  ConflictResolution,
} from "@/types/parallel";

/**
 * Active tasks being tracked for conflicts
 */
const activeTasks = new Map<string, ParallelTask>();

/**
 * Register a task as active
 */
export const registerActiveTask = (task: ParallelTask): void => {
  activeTasks.set(task.id, task);
};

/**
 * Unregister a task when completed
 */
export const unregisterActiveTask = (taskId: string): void => {
  activeTasks.delete(taskId);
};

/**
 * Clear all active tasks
 */
export const clearActiveTasks = (): void => {
  activeTasks.clear();
};

/**
 * Get all active task IDs
 */
export const getActiveTaskIds = (): string[] => {
  return Array.from(activeTasks.keys());
};

/**
 * Check if two tasks conflict based on their paths
 */
const checkPathConflict = (
  taskA: ParallelTask,
  taskB: ParallelTask,
): string[] => {
  const pathsA = taskA.conflictPaths ?? [];
  const pathsB = taskB.conflictPaths ?? [];

  const conflictingPaths: string[] = [];

  for (const pathA of pathsA) {
    for (const pathB of pathsB) {
      if (pathsOverlap(pathA, pathB)) {
        conflictingPaths.push(pathA);
      }
    }
  }

  return conflictingPaths;
};

/**
 * Check if two paths overlap (one contains or equals the other)
 */
const pathsOverlap = (pathA: string, pathB: string): boolean => {
  const normalizedA = normalizePath(pathA);
  const normalizedB = normalizePath(pathB);

  // Exact match
  if (normalizedA === normalizedB) return true;

  // One is parent of the other
  if (normalizedA.startsWith(normalizedB + "/")) return true;
  if (normalizedB.startsWith(normalizedA + "/")) return true;

  return false;
};

/**
 * Normalize path for comparison
 */
const normalizePath = (path: string): string => {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
};

/**
 * Check if task types can conflict
 */
const canTypesConflict = (typeA: string, typeB: string): boolean => {
  // Read-only tasks don't conflict with each other
  if (READ_ONLY_TASK_TYPES.has(typeA) && READ_ONLY_TASK_TYPES.has(typeB)) {
    return false;
  }

  // Modifying tasks conflict with everything on same paths
  if (MODIFYING_TASK_TYPES.has(typeA) || MODIFYING_TASK_TYPES.has(typeB)) {
    return true;
  }

  return false;
};

/**
 * Check if a task conflicts with any active tasks
 */
export const checkConflicts = (task: ParallelTask): ConflictCheckResult => {
  if (!CONFLICT_CONFIG.ENABLE_PATH_CONFLICT) {
    return {
      hasConflict: false,
      conflictingTaskIds: [],
      conflictingPaths: [],
    };
  }

  const conflictingTaskIds: string[] = [];
  const conflictingPaths: string[] = [];

  for (const [activeId, activeTask] of activeTasks) {
    // Skip self
    if (activeId === task.id) continue;

    // Check if task types can conflict
    if (!canTypesConflict(task.type, activeTask.type)) continue;

    // Check path conflicts
    const pathConflicts = checkPathConflict(task, activeTask);

    if (pathConflicts.length > 0) {
      conflictingTaskIds.push(activeId);
      conflictingPaths.push(...pathConflicts);
    }
  }

  const hasConflict = conflictingTaskIds.length > 0;

  // Suggest resolution
  const resolution = hasConflict
    ? suggestResolution(task, conflictingTaskIds)
    : undefined;

  return {
    hasConflict,
    conflictingTaskIds,
    conflictingPaths: [...new Set(conflictingPaths)],
    resolution,
  };
};

/**
 * Suggest a conflict resolution strategy
 */
const suggestResolution = (
  task: ParallelTask,
  conflictingTaskIds: string[],
): ConflictResolution => {
  // Read-only tasks should wait
  if (READ_ONLY_TASK_TYPES.has(task.type)) {
    return "wait";
  }

  // High priority tasks may cancel lower priority conflicts
  const conflictingTasks = conflictingTaskIds
    .map((id) => activeTasks.get(id))
    .filter((t): t is ParallelTask => t !== undefined);

  const allLowerPriority = conflictingTasks.every(
    (t) => getPriorityValue(t.priority) < getPriorityValue(task.priority),
  );

  if (allLowerPriority && task.priority === "critical") {
    return "cancel";
  }

  // Default to waiting
  return "wait";
};

/**
 * Get numeric priority value
 */
const getPriorityValue = (priority: string): number => {
  const values: Record<string, number> = {
    critical: 100,
    high: 75,
    normal: 50,
    low: 25,
  };
  return values[priority] ?? 50;
};

/**
 * Wait for conflicts to resolve
 */
export const waitForConflictResolution = async (
  taskIds: string[],
  timeout: number = CONFLICT_CONFIG.CONFLICT_CHECK_TIMEOUT_MS,
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const stillActive = taskIds.filter((id) => activeTasks.has(id));

    if (stillActive.length === 0) {
      return true;
    }

    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
};

/**
 * Get tasks that would be affected by cancelling a task
 */
export const getDependentTasks = (taskId: string): string[] => {
  const task = activeTasks.get(taskId);
  if (!task) return [];

  const dependents: string[] = [];

  for (const [id, activeTask] of activeTasks) {
    if (id === taskId) continue;

    // Check if this task was waiting on the cancelled task
    const conflicts = checkPathConflict(activeTask, task);
    if (conflicts.length > 0) {
      dependents.push(id);
    }
  }

  return dependents;
};
