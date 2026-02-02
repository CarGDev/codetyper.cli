/**
 * Resource Manager
 *
 * Manages concurrent task execution limits using a semaphore pattern.
 * Handles task queuing, priority ordering, and rate limiting.
 */

import {
  PARALLEL_DEFAULTS,
  PRIORITY_WEIGHTS,
  TASK_TYPE_LIMITS,
  PARALLEL_ERRORS,
} from "@constants/parallel";
import type {
  ParallelTask,
  ResourceLimits,
  ResourceState,
  SemaphoreState,
  TaskPriority,
} from "@/types/parallel";

// ============================================================================
// Semaphore Implementation
// ============================================================================

interface WaitingTask {
  task: ParallelTask;
  resolve: () => void;
  reject: (reason: Error) => void;
}

class Semaphore {
  private permits: number;
  private readonly maxPermits: number;
  private waiting: WaitingTask[] = [];

  constructor(permits: number) {
    this.permits = permits;
    this.maxPermits = permits;
  }

  async acquire(task: ParallelTask): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.waiting.push({ task, resolve, reject });
      // Sort by priority (highest first)
      this.waiting.sort(
        (a, b) =>
          PRIORITY_WEIGHTS[b.task.priority] - PRIORITY_WEIGHTS[a.task.priority],
      );
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) {
        next.resolve();
      }
    } else {
      this.permits = Math.min(this.permits + 1, this.maxPermits);
    }
  }

  cancelWaiting(taskId: string): boolean {
    const index = this.waiting.findIndex((w) => w.task.id === taskId);
    if (index === -1) return false;

    const [removed] = this.waiting.splice(index, 1);
    removed.reject(new Error(PARALLEL_ERRORS.CANCELLED(taskId)));
    return true;
  }

  getState(): SemaphoreState {
    return {
      permits: this.permits,
      maxPermits: this.maxPermits,
      waiting: this.waiting.length,
    };
  }

  clearWaiting(): void {
    for (const waiting of this.waiting) {
      waiting.reject(new Error(PARALLEL_ERRORS.EXECUTOR_ABORTED));
    }
    this.waiting = [];
  }
}

// ============================================================================
// Resource Manager
// ============================================================================

let globalSemaphore: Semaphore | null = null;
const taskTypeSemaphores = new Map<string, Semaphore>();
let resourceState: ResourceState = {
  activeTasks: 0,
  queuedTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  totalDuration: 0,
};

/**
 * Initialize resource manager with limits
 */
export const initializeResourceManager = (
  limits: ResourceLimits = PARALLEL_DEFAULTS,
): void => {
  globalSemaphore = new Semaphore(limits.maxConcurrentTasks);

  // Create per-type semaphores
  taskTypeSemaphores.clear();
  for (const [type, limit] of Object.entries(TASK_TYPE_LIMITS)) {
    taskTypeSemaphores.set(type, new Semaphore(limit));
  }

  // Reset state
  resourceState = {
    activeTasks: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalDuration: 0,
  };
};

/**
 * Acquire resources for a task
 */
export const acquireResources = async (task: ParallelTask): Promise<void> => {
  if (!globalSemaphore) {
    initializeResourceManager();
  }

  resourceState.queuedTasks++;

  try {
    // Acquire global permit
    await globalSemaphore!.acquire(task);

    // Acquire type-specific permit if exists
    const typeSemaphore = taskTypeSemaphores.get(task.type);
    if (typeSemaphore) {
      await typeSemaphore.acquire(task);
    }

    resourceState.queuedTasks--;
    resourceState.activeTasks++;
  } catch (error) {
    resourceState.queuedTasks--;
    throw error;
  }
};

/**
 * Release resources after task completion
 */
export const releaseResources = (task: ParallelTask, duration: number, success: boolean): void => {
  if (!globalSemaphore) return;

  // Release global permit
  globalSemaphore.release();

  // Release type-specific permit
  const typeSemaphore = taskTypeSemaphores.get(task.type);
  if (typeSemaphore) {
    typeSemaphore.release();
  }

  // Update state
  resourceState.activeTasks--;
  resourceState.totalDuration += duration;

  if (success) {
    resourceState.completedTasks++;
  } else {
    resourceState.failedTasks++;
  }
};

/**
 * Cancel a waiting task
 */
export const cancelWaitingTask = (taskId: string): boolean => {
  if (!globalSemaphore) return false;

  const cancelled = globalSemaphore.cancelWaiting(taskId);

  if (cancelled) {
    resourceState.queuedTasks--;
  }

  return cancelled;
};

/**
 * Get current resource state
 */
export const getResourceState = (): ResourceState => ({
  ...resourceState,
});

/**
 * Get semaphore state for a task type
 */
export const getTypeSemaphoreState = (type: string): SemaphoreState | null => {
  const semaphore = taskTypeSemaphores.get(type);
  return semaphore ? semaphore.getState() : null;
};

/**
 * Get global semaphore state
 */
export const getGlobalSemaphoreState = (): SemaphoreState | null => {
  return globalSemaphore ? globalSemaphore.getState() : null;
};

/**
 * Check if we can accept more tasks
 */
export const canAcceptTask = (
  limits: ResourceLimits = PARALLEL_DEFAULTS,
): boolean => {
  const totalPending = resourceState.activeTasks + resourceState.queuedTasks;
  return totalPending < limits.maxQueueSize;
};

/**
 * Reset resource manager
 */
export const resetResourceManager = (): void => {
  if (globalSemaphore) {
    globalSemaphore.clearWaiting();
  }

  for (const semaphore of taskTypeSemaphores.values()) {
    semaphore.clearWaiting();
  }

  resourceState = {
    activeTasks: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalDuration: 0,
  };
};

/**
 * Get queue position for a task based on priority
 */
export const getQueuePosition = (priority: TaskPriority): number => {
  if (!globalSemaphore) return 0;

  const state = globalSemaphore.getState();

  // Estimate position based on priority
  // Higher priority tasks will be processed first
  const priorityWeight = PRIORITY_WEIGHTS[priority];
  const avgWeight =
    (PRIORITY_WEIGHTS.critical +
      PRIORITY_WEIGHTS.high +
      PRIORITY_WEIGHTS.normal +
      PRIORITY_WEIGHTS.low) /
    4;

  const positionFactor = avgWeight / priorityWeight;
  return Math.ceil(state.waiting * positionFactor);
};
