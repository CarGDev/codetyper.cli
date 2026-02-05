/**
 * Parallel Executor
 *
 * Main orchestrator for parallel task execution.
 * Coordinates conflict detection, resource management, and result aggregation.
 */

import {
  PARALLEL_DEFAULTS,
  PARALLEL_ERRORS,
  TASK_TIMEOUTS,
} from "@constants/parallel";
import {
  registerActiveTask,
  unregisterActiveTask,
  checkConflicts,
  waitForConflictResolution,
  clearActiveTasks,
} from "@services/parallel/conflict-detector";
import {
  initializeResourceManager,
  acquireResources,
  releaseResources,
  canAcceptTask,
  cancelWaitingTask,
  resetResourceManager,
  getResourceState,
} from "@services/parallel/resource-manager";
import { collectResults } from "@services/parallel/result-aggregator";
import type {
  ParallelTask,
  ParallelExecutionResult,
  ParallelExecutorOptions,
  AggregatedResults,
  BatchExecutionRequest,
  ConflictResolution,
} from "@/types/parallel";

// Re-export utilities
export * from "@services/parallel/conflict-detector";
export * from "@services/parallel/resource-manager";
export * from "@services/parallel/result-aggregator";

// ============================================================================
// Task Execution
// ============================================================================

/**
 * Execute a single task with timeout and error handling
 */
const executeTask = async <TInput, TOutput>(
  task: ParallelTask<TInput, TOutput>,
  executor: (input: TInput) => Promise<TOutput>,
  options: ParallelExecutorOptions,
): Promise<ParallelExecutionResult<TOutput>> => {
  const startedAt = Date.now();
  const timeout =
    task.timeout ??
    TASK_TIMEOUTS[task.type] ??
    PARALLEL_DEFAULTS.defaultTimeout;

  try {
    // Notify task start
    options.onTaskStart?.(task);

    // Execute with timeout
    const result = await Promise.race([
      executor(task.input),
      createTimeout<TOutput>(timeout, task.id),
    ]);

    const completedAt = Date.now();
    const executionResult: ParallelExecutionResult<TOutput> = {
      taskId: task.id,
      status: "completed",
      result,
      duration: completedAt - startedAt,
      startedAt,
      completedAt,
    };

    options.onTaskComplete?.(executionResult);
    return executionResult;
  } catch (error) {
    const completedAt = Date.now();
    const isTimeout = error instanceof TimeoutError;

    const executionResult: ParallelExecutionResult<TOutput> = {
      taskId: task.id,
      status: isTimeout ? "timeout" : "error",
      error: error instanceof Error ? error.message : String(error),
      duration: completedAt - startedAt,
      startedAt,
      completedAt,
    };

    options.onTaskError?.(
      task,
      error instanceof Error ? error : new Error(String(error)),
    );
    return executionResult;
  }
};

/**
 * Create a timeout promise
 */
class TimeoutError extends Error {
  constructor(taskId: string) {
    super(PARALLEL_ERRORS.TIMEOUT(taskId));
    this.name = "TimeoutError";
  }
}

const createTimeout = <T>(ms: number, taskId: string): Promise<T> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError(taskId)), ms);
  });
};

// ============================================================================
// Parallel Executor
// ============================================================================

/**
 * Execute tasks in parallel with conflict detection and resource management
 */
export const executeParallel = async <TInput, TOutput>(
  tasks: ParallelTask<TInput, TOutput>[],
  executor: (input: TInput) => Promise<TOutput>,
  options: Partial<ParallelExecutorOptions> = {},
): Promise<AggregatedResults<TOutput>> => {
  const fullOptions: ParallelExecutorOptions = {
    limits: options.limits ?? PARALLEL_DEFAULTS,
    onTaskStart: options.onTaskStart,
    onTaskComplete: options.onTaskComplete,
    onTaskError: options.onTaskError,
    onConflict: options.onConflict,
    abortSignal: options.abortSignal,
  };

  // Initialize resource manager
  initializeResourceManager(fullOptions.limits);

  // Track results
  const results: ParallelExecutionResult<TOutput>[] = [];
  const pendingTasks = new Map<
    string,
    Promise<ParallelExecutionResult<TOutput>>
  >();

  // Check if executor was aborted
  const checkAbort = (): boolean => {
    return fullOptions.abortSignal?.aborted ?? false;
  };

  // Process each task
  for (const task of tasks) {
    if (checkAbort()) {
      results.push({
        taskId: task.id,
        status: "cancelled",
        error: PARALLEL_ERRORS.EXECUTOR_ABORTED,
        duration: 0,
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
      continue;
    }

    // Check if we can accept more tasks
    if (!canAcceptTask(fullOptions.limits)) {
      results.push({
        taskId: task.id,
        status: "error",
        error: PARALLEL_ERRORS.QUEUE_FULL,
        duration: 0,
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
      continue;
    }

    // Start task execution
    const taskPromise = executeWithConflictHandling(
      task,
      executor,
      fullOptions,
    );

    pendingTasks.set(task.id, taskPromise);

    // Remove from pending when done
    taskPromise.then((result) => {
      pendingTasks.delete(task.id);
      results.push(result);
    });
  }

  // Wait for all pending tasks
  await Promise.all(pendingTasks.values());

  // Cleanup
  clearActiveTasks();

  return collectResults(results);
};

/**
 * Execute a task with conflict handling
 */
const executeWithConflictHandling = async <TInput, TOutput>(
  task: ParallelTask<TInput, TOutput>,
  executor: (input: TInput) => Promise<TOutput>,
  options: ParallelExecutorOptions,
): Promise<ParallelExecutionResult<TOutput>> => {
  // Acquire resources
  await acquireResources(task);

  try {
    // Check for conflicts
    const conflicts = checkConflicts(task);

    if (conflicts.hasConflict) {
      const resolution =
        options.onConflict?.(task, conflicts) ?? conflicts.resolution ?? "wait";

      const handled = await handleConflict(
        task,
        conflicts,
        resolution,
        options,
      );
      if (!handled.continue) {
        releaseResources(task, 0, false);
        return handled.result;
      }
    }

    // Register as active
    registerActiveTask(task);

    // Execute task
    const result = await executeTask(task, executor, options);

    // Unregister and release resources
    unregisterActiveTask(task.id);
    releaseResources(task, result.duration, result.status === "completed");

    return result;
  } catch (error) {
    releaseResources(task, 0, false);
    throw error;
  }
};

/**
 * Handle task conflict based on resolution strategy
 */
const handleConflict = async <TInput, TOutput>(
  task: ParallelTask<TInput, TOutput>,
  conflicts: { conflictingTaskIds: string[]; conflictingPaths: string[] },
  resolution: ConflictResolution,
  _options: ParallelExecutorOptions,
): Promise<{ continue: boolean; result: ParallelExecutionResult<TOutput> }> => {
  const createFailResult = (
    status: "conflict" | "cancelled",
    error: string,
  ) => ({
    continue: false,
    result: {
      taskId: task.id,
      status,
      error,
      duration: 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
    } as ParallelExecutionResult<TOutput>,
  });

  const resolutionHandlers: Record<
    ConflictResolution,
    () => Promise<{
      continue: boolean;
      result: ParallelExecutionResult<TOutput>;
    }>
  > = {
    wait: async () => {
      const resolved = await waitForConflictResolution(
        conflicts.conflictingTaskIds,
      );
      if (resolved) {
        return {
          continue: true,
          result: {} as ParallelExecutionResult<TOutput>,
        };
      }
      return createFailResult(
        "conflict",
        PARALLEL_ERRORS.CONFLICT(task.id, conflicts.conflictingPaths),
      );
    },

    cancel: async () => {
      // Cancel conflicting tasks
      for (const id of conflicts.conflictingTaskIds) {
        cancelWaitingTask(id);
      }
      return { continue: true, result: {} as ParallelExecutionResult<TOutput> };
    },

    merge: async () => {
      // For merge, we continue and let result aggregator handle merging
      return { continue: true, result: {} as ParallelExecutionResult<TOutput> };
    },

    abort: async () => {
      return createFailResult(
        "conflict",
        PARALLEL_ERRORS.CONFLICT(task.id, conflicts.conflictingPaths),
      );
    },
  };

  return resolutionHandlers[resolution]();
};

// ============================================================================
// Batch Execution
// ============================================================================

/**
 * Execute a batch of tasks
 */
export const executeBatch = async <TInput, TOutput>(
  request: BatchExecutionRequest<TInput>,
  executor: (input: TInput) => Promise<TOutput>,
): Promise<AggregatedResults<TOutput>> => {
  return executeParallel(
    request.tasks as ParallelTask<TInput, TOutput>[],
    executor,
    request.options,
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a task ID
 */
export const createTaskId = (): string => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a parallel task
 */
export const createTask = <TInput>(
  input: TInput,
  options: Partial<ParallelTask<TInput>> = {},
): ParallelTask<TInput> => ({
  id: options.id ?? createTaskId(),
  type: options.type ?? "explore",
  agent: options.agent ?? { name: "default" },
  input,
  priority: options.priority ?? "normal",
  conflictPaths: options.conflictPaths,
  timeout: options.timeout,
  metadata: options.metadata,
});

/**
 * Reset the parallel executor
 */
export const resetParallelExecutor = (): void => {
  clearActiveTasks();
  resetResourceManager();
};

/**
 * Get execution statistics
 */
export const getExecutionStats = () => {
  return getResourceState();
};
