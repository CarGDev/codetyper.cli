/**
 * Background task types for async operations
 * Allows tasks to run in background while user continues working
 * Triggered with Ctrl+B or /background command
 */

export type BackgroundTaskStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type BackgroundTaskPriority = "low" | "normal" | "high";

export interface BackgroundTask {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: BackgroundTaskStatus;
  readonly priority: BackgroundTaskPriority;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly progress: TaskProgress;
  readonly result?: TaskResult;
  readonly error?: TaskError;
  readonly metadata: TaskMetadata;
}

export interface TaskProgress {
  readonly current: number;
  readonly total: number;
  readonly percentage: number;
  readonly message: string;
  readonly steps: ReadonlyArray<TaskStep>;
}

export interface TaskStep {
  readonly name: string;
  readonly status: BackgroundTaskStatus;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly output?: string;
}

export interface TaskResult {
  readonly success: boolean;
  readonly output: string;
  readonly artifacts: ReadonlyArray<TaskArtifact>;
  readonly summary: string;
}

export interface TaskArtifact {
  readonly type: "file" | "diff" | "report" | "data";
  readonly name: string;
  readonly path?: string;
  readonly content?: string;
}

export interface TaskError {
  readonly code: string;
  readonly message: string;
  readonly stack?: string;
  readonly recoverable: boolean;
}

export interface TaskMetadata {
  readonly sessionId: string;
  readonly agentId?: string;
  readonly prompt?: string;
  readonly tools: ReadonlyArray<string>;
  readonly startedByUser: boolean;
}

export interface BackgroundTaskConfig {
  readonly maxConcurrent: number;
  readonly defaultTimeout: number;
  readonly retryOnFailure: boolean;
  readonly maxRetries: number;
  readonly notifyOnComplete: boolean;
  readonly persistTasks: boolean;
}

export interface TaskNotification {
  readonly taskId: string;
  readonly type: "started" | "progress" | "completed" | "failed";
  readonly message: string;
  readonly timestamp: number;
}

export interface BackgroundTaskStore {
  readonly tasks: ReadonlyMap<string, BackgroundTask>;
  readonly queue: ReadonlyArray<string>;
  readonly running: ReadonlyArray<string>;
  readonly completed: ReadonlyArray<string>;
}

export const DEFAULT_BACKGROUND_TASK_CONFIG: BackgroundTaskConfig = {
  maxConcurrent: 3,
  defaultTimeout: 300000, // 5 minutes
  retryOnFailure: false,
  maxRetries: 1,
  notifyOnComplete: true,
  persistTasks: true,
};

export const BACKGROUND_TASK_PRIORITIES: Record<BackgroundTaskPriority, number> = {
  low: 1,
  normal: 5,
  high: 10,
};
