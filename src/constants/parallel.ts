/**
 * Parallel Agent Execution Constants
 *
 * Configuration for concurrent task execution, resource limits,
 * and conflict detection.
 */

import type { ResourceLimits, TaskPriority } from "@/types/parallel";

/**
 * Default resource limits
 */
export const PARALLEL_DEFAULTS: ResourceLimits = {
  maxConcurrentTasks: 5,
  maxQueueSize: 50,
  defaultTimeout: 60000,
  maxRetries: 2,
} as const;

/**
 * Priority weights for task ordering
 */
export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
} as const;

/**
 * Task type concurrency limits
 * Some task types should have lower concurrency
 */
export const TASK_TYPE_LIMITS = {
  explore: 5,
  analyze: 4,
  execute: 2,
  search: 3,
} as const;

/**
 * Conflict detection configuration
 */
export const CONFLICT_CONFIG = {
  ENABLE_PATH_CONFLICT: true,
  CONFLICT_CHECK_TIMEOUT_MS: 5000,
  AUTO_RESOLVE_READ_CONFLICTS: true,
} as const;

/**
 * Timeout values for different task types
 */
export const TASK_TIMEOUTS = {
  explore: 30000,
  analyze: 45000,
  execute: 120000,
  search: 15000,
} as const;

/**
 * Error messages for parallel execution
 */
export const PARALLEL_ERRORS = {
  QUEUE_FULL: "Task queue is full",
  TIMEOUT: (taskId: string) => `Task ${taskId} timed out`,
  CONFLICT: (taskId: string, paths: string[]) =>
    `Task ${taskId} conflicts with paths: ${paths.join(", ")}`,
  MAX_RETRIES: (taskId: string, retries: number) =>
    `Task ${taskId} failed after ${retries} retries`,
  CANCELLED: (taskId: string) => `Task ${taskId} was cancelled`,
  INVALID_TASK: "Invalid task configuration",
  EXECUTOR_ABORTED: "Executor was aborted",
} as const;

/**
 * Status messages for parallel execution
 */
export const PARALLEL_MESSAGES = {
  STARTING: (count: number) => `Starting ${count} parallel task(s)`,
  COMPLETED: (success: number, failed: number) =>
    `Completed: ${success} successful, ${failed} failed`,
  QUEUED: (taskId: string, position: number) =>
    `Task ${taskId} queued at position ${position}`,
  RUNNING: (taskId: string) => `Running task: ${taskId}`,
  WAITING_CONFLICT: (taskId: string) =>
    `Task ${taskId} waiting for conflict resolution`,
  RETRYING: (taskId: string, attempt: number) =>
    `Retrying task ${taskId} (attempt ${attempt})`,
} as const;

/**
 * Deduplication configuration
 */
export const DEDUP_CONFIG = {
  ENABLE_CONTENT_DEDUP: true,
  SIMILARITY_THRESHOLD: 0.95,
  MAX_RESULTS_PER_TYPE: 100,
} as const;

/**
 * Read-only task types (no conflict with each other)
 */
export const READ_ONLY_TASK_TYPES = new Set(["explore", "analyze", "search"]);

/**
 * Modifying task types (conflict with all tasks on same paths)
 */
export const MODIFYING_TASK_TYPES = new Set(["execute"]);
