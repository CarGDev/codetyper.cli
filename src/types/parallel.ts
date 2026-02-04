/**
 * Parallel Agent Execution Types
 *
 * Types for concurrent agent execution with conflict detection,
 * resource management, and result aggregation.
 */

/**
 * Task type for parallel execution
 */
export type ParallelTaskType =
  | "explore"    // Read-only exploration
  | "analyze"    // Analysis without modification
  | "execute"    // May modify files
  | "search";    // Search operations

/**
 * Task priority levels
 */
export type TaskPriority = "low" | "normal" | "high" | "critical";

/**
 * Task execution status
 */
export type ParallelTaskStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "error"
  | "conflict"
  | "cancelled"
  | "timeout";

/**
 * Agent configuration for parallel task
 */
export interface ParallelAgentConfig {
  name: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Parallel task definition
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ParallelTask<TInput = unknown, _TOutput = unknown> {
  id: string;
  type: ParallelTaskType;
  agent: ParallelAgentConfig;
  input: TInput;
  priority: TaskPriority;
  conflictPaths?: string[];
  timeout?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Task execution result
 */
export interface ParallelExecutionResult<TOutput = unknown> {
  taskId: string;
  status: ParallelTaskStatus;
  result?: TOutput;
  error?: string;
  duration: number;
  startedAt: number;
  completedAt: number;
  retryAttempt?: number;
}

/**
 * Conflict detection result
 */
export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingTaskIds: string[];
  conflictingPaths: string[];
  resolution?: ConflictResolution;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution =
  | "wait"       // Wait for conflicting task to complete
  | "cancel"     // Cancel conflicting task
  | "merge"      // Attempt to merge results
  | "abort";     // Abort this task

/**
 * Resource limits for parallel execution
 */
export interface ResourceLimits {
  maxConcurrentTasks: number;
  maxQueueSize: number;
  defaultTimeout: number;
  maxRetries: number;
}

/**
 * Resource usage state
 */
export interface ResourceState {
  activeTasks: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalDuration: number;
}

/**
 * Aggregated results from parallel execution
 */
export interface AggregatedResults<TOutput = unknown> {
  results: ParallelExecutionResult<TOutput>[];
  successful: number;
  failed: number;
  cancelled: number;
  totalDuration: number;
  aggregatedOutput?: TOutput;
}

/**
 * Parallel executor options
 */
export interface ParallelExecutorOptions {
  limits: ResourceLimits;
  onTaskStart?: (task: ParallelTask) => void;
  onTaskComplete?: (result: ParallelExecutionResult) => void;
  onTaskError?: (task: ParallelTask, error: Error) => void;
  onConflict?: (task: ParallelTask, conflict: ConflictCheckResult) => ConflictResolution;
  abortSignal?: AbortSignal;
}

/**
 * Batch execution request
 */
export interface BatchExecutionRequest<TInput = unknown> {
  tasks: ParallelTask<TInput>[];
  options?: Partial<ParallelExecutorOptions>;
  aggregateResults?: boolean;
}

/**
 * Semaphore state for resource management
 */
export interface SemaphoreState {
  permits: number;
  maxPermits: number;
  waiting: number;
}

/**
 * Deduplication key for result merging
 */
export interface DeduplicationKey {
  type: string;
  path?: string;
  content?: string;
}

/**
 * Deduplication result
 */
export interface DeduplicationResult<T> {
  unique: T[];
  duplicateCount: number;
  mergedCount: number;
}
