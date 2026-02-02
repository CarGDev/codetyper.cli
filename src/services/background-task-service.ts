/**
 * Background task service
 * Manages background task execution, queue, and lifecycle
 */

import { randomUUID } from "node:crypto";
import { writeFile, readFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

import type {
  BackgroundTask,
  BackgroundTaskStatus,
  BackgroundTaskPriority,
  BackgroundTaskConfig,
  TaskProgress,
  TaskResult,
  TaskError,
  TaskMetadata,
  TaskNotification,
  TaskStep,
  TaskArtifact,
} from "@src/types/background-task";
import { DEFAULT_BACKGROUND_TASK_CONFIG, BACKGROUND_TASK_PRIORITIES } from "@src/types/background-task";
import {
  BACKGROUND_TASK,
  BACKGROUND_TASK_STORAGE,
  BACKGROUND_TASK_MESSAGES,
  BACKGROUND_TASK_STATUS_ICONS,
} from "@src/constants/background-task";

type TaskHandler = (task: BackgroundTask, updateProgress: (progress: Partial<TaskProgress>) => void) => Promise<TaskResult>;
type NotificationHandler = (notification: TaskNotification) => void;

interface BackgroundTaskState {
  tasks: Map<string, BackgroundTask>;
  queue: string[];
  running: string[];
  handlers: Map<string, TaskHandler>;
  notificationHandlers: NotificationHandler[];
  config: BackgroundTaskConfig;
}

const state: BackgroundTaskState = {
  tasks: new Map(),
  queue: [],
  running: [],
  handlers: new Map(),
  notificationHandlers: [],
  config: DEFAULT_BACKGROUND_TASK_CONFIG,
};

const getStoragePath = (): string => {
  const basePath = join(homedir(), ".local", "share", "codetyper", "tasks");
  return basePath;
};

const ensureStorageDirectory = async (): Promise<void> => {
  const storagePath = getStoragePath();
  if (!existsSync(storagePath)) {
    await mkdir(storagePath, { recursive: true });
  }
};

const persistTask = async (task: BackgroundTask): Promise<void> => {
  if (!state.config.persistTasks) return;

  await ensureStorageDirectory();
  const filePath = join(getStoragePath(), `${task.id}${BACKGROUND_TASK_STORAGE.FILE_EXTENSION}`);
  await writeFile(filePath, JSON.stringify(task, null, 2));
};

const removePersistedTask = async (taskId: string): Promise<void> => {
  const filePath = join(getStoragePath(), `${taskId}${BACKGROUND_TASK_STORAGE.FILE_EXTENSION}`);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
};

const loadPersistedTasks = async (): Promise<void> => {
  const storagePath = getStoragePath();
  if (!existsSync(storagePath)) return;

  const files = await readdir(storagePath);
  const taskFiles = files.filter((f) => f.endsWith(BACKGROUND_TASK_STORAGE.FILE_EXTENSION));

  for (const file of taskFiles) {
    try {
      const content = await readFile(join(storagePath, file), "utf-8");
      const task = JSON.parse(content) as BackgroundTask;

      // Re-queue pending/running tasks that were interrupted
      if (task.status === "pending" || task.status === "running") {
        const updatedTask: BackgroundTask = {
          ...task,
          status: "pending",
        };
        state.tasks.set(task.id, updatedTask);
        state.queue.push(task.id);
      } else {
        state.tasks.set(task.id, task);
      }
    } catch {
      // Skip corrupted task files
    }
  }
};

const notify = (taskId: string, type: TaskNotification["type"], message: string): void => {
  const notification: TaskNotification = {
    taskId,
    type,
    message,
    timestamp: Date.now(),
  };

  state.notificationHandlers.forEach((handler) => handler(notification));
};

const createInitialProgress = (): TaskProgress => ({
  current: 0,
  total: 100,
  percentage: 0,
  message: "Starting...",
  steps: [],
});

const processQueue = async (): Promise<void> => {
  while (
    state.queue.length > 0 &&
    state.running.length < state.config.maxConcurrent
  ) {
    // Sort by priority
    state.queue.sort((a, b) => {
      const taskA = state.tasks.get(a);
      const taskB = state.tasks.get(b);
      if (!taskA || !taskB) return 0;
      return BACKGROUND_TASK_PRIORITIES[taskB.priority] - BACKGROUND_TASK_PRIORITIES[taskA.priority];
    });

    const taskId = state.queue.shift();
    if (!taskId) continue;

    const task = state.tasks.get(taskId);
    if (!task) continue;

    await executeTask(task);
  }
};

const executeTask = async (task: BackgroundTask): Promise<void> => {
  const handler = state.handlers.get(task.name);
  if (!handler) {
    await updateTaskStatus(task.id, "failed", {
      code: "HANDLER_NOT_FOUND",
      message: `No handler registered for task: ${task.name}`,
      recoverable: false,
    });
    return;
  }

  state.running.push(task.id);

  const updatedTask: BackgroundTask = {
    ...task,
    status: "running",
    startedAt: Date.now(),
  };
  state.tasks.set(task.id, updatedTask);
  await persistTask(updatedTask);

  notify(task.id, "started", BACKGROUND_TASK_MESSAGES.STARTED);

  const updateProgress = (partial: Partial<TaskProgress>): void => {
    const currentTask = state.tasks.get(task.id);
    if (!currentTask) return;

    const newProgress: TaskProgress = {
      ...currentTask.progress,
      ...partial,
      percentage: partial.current !== undefined && partial.total !== undefined
        ? Math.round((partial.current / partial.total) * 100)
        : currentTask.progress.percentage,
    };

    const progressTask: BackgroundTask = {
      ...currentTask,
      progress: newProgress,
    };
    state.tasks.set(task.id, progressTask);

    notify(task.id, "progress", newProgress.message);
  };

  try {
    const result = await Promise.race([
      handler(updatedTask, updateProgress),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Task timeout")), state.config.defaultTimeout)
      ),
    ]);

    await completeTask(task.id, result);
  } catch (error) {
    const taskError: TaskError = {
      code: "EXECUTION_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      recoverable: true,
    };

    await updateTaskStatus(task.id, "failed", taskError);
  } finally {
    state.running = state.running.filter((id) => id !== task.id);
    processQueue();
  }
};

const completeTask = async (taskId: string, result: TaskResult): Promise<void> => {
  const task = state.tasks.get(taskId);
  if (!task) return;

  const completedTask: BackgroundTask = {
    ...task,
    status: "completed",
    completedAt: Date.now(),
    result,
    progress: {
      ...task.progress,
      current: task.progress.total,
      percentage: 100,
      message: "Completed",
    },
  };

  state.tasks.set(taskId, completedTask);
  await persistTask(completedTask);

  notify(taskId, "completed", BACKGROUND_TASK_MESSAGES.COMPLETED);
};

const updateTaskStatus = async (
  taskId: string,
  status: BackgroundTaskStatus,
  error?: TaskError
): Promise<void> => {
  const task = state.tasks.get(taskId);
  if (!task) return;

  const updatedTask: BackgroundTask = {
    ...task,
    status,
    error,
    completedAt: ["completed", "failed", "cancelled"].includes(status) ? Date.now() : undefined,
  };

  state.tasks.set(taskId, updatedTask);
  await persistTask(updatedTask);

  if (status === "failed") {
    notify(taskId, "failed", error?.message || BACKGROUND_TASK_MESSAGES.FAILED);
  }
};

// Public API

export const initialize = async (config?: Partial<BackgroundTaskConfig>): Promise<void> => {
  state.config = { ...DEFAULT_BACKGROUND_TASK_CONFIG, ...config };
  await loadPersistedTasks();
  processQueue();
};

export const registerHandler = (name: string, handler: TaskHandler): void => {
  state.handlers.set(name, handler);
};

export const onNotification = (handler: NotificationHandler): () => void => {
  state.notificationHandlers.push(handler);
  return () => {
    state.notificationHandlers = state.notificationHandlers.filter((h) => h !== handler);
  };
};

export const createTask = async (
  name: string,
  description: string,
  metadata: TaskMetadata,
  priority: BackgroundTaskPriority = "normal"
): Promise<BackgroundTask> => {
  const task: BackgroundTask = {
    id: randomUUID(),
    name,
    description,
    status: "pending",
    priority,
    createdAt: Date.now(),
    progress: createInitialProgress(),
    metadata,
  };

  state.tasks.set(task.id, task);
  state.queue.push(task.id);

  await persistTask(task);
  processQueue();

  return task;
};

export const cancelTask = async (taskId: string): Promise<boolean> => {
  const task = state.tasks.get(taskId);
  if (!task) return false;

  if (task.status === "running") {
    await updateTaskStatus(taskId, "cancelled");
    state.running = state.running.filter((id) => id !== taskId);
    notify(taskId, "failed", BACKGROUND_TASK_MESSAGES.CANCELLED);
    return true;
  }

  if (task.status === "pending") {
    state.queue = state.queue.filter((id) => id !== taskId);
    await updateTaskStatus(taskId, "cancelled");
    return true;
  }

  return false;
};

export const pauseTask = async (taskId: string): Promise<boolean> => {
  const task = state.tasks.get(taskId);
  if (!task || task.status !== "running") return false;

  await updateTaskStatus(taskId, "paused");
  state.running = state.running.filter((id) => id !== taskId);
  notify(taskId, "progress", BACKGROUND_TASK_MESSAGES.PAUSED);
  return true;
};

export const resumeTask = async (taskId: string): Promise<boolean> => {
  const task = state.tasks.get(taskId);
  if (!task || task.status !== "paused") return false;

  state.queue.unshift(taskId);
  await updateTaskStatus(taskId, "pending");
  notify(taskId, "progress", BACKGROUND_TASK_MESSAGES.RESUMED);
  processQueue();
  return true;
};

export const getTask = (taskId: string): BackgroundTask | undefined =>
  state.tasks.get(taskId);

export const listTasks = (filter?: { status?: BackgroundTaskStatus }): ReadonlyArray<BackgroundTask> => {
  let tasks = Array.from(state.tasks.values());

  if (filter?.status) {
    tasks = tasks.filter((t) => t.status === filter.status);
  }

  return tasks.sort((a, b) => b.createdAt - a.createdAt);
};

export const clearCompletedTasks = async (): Promise<number> => {
  const completed = Array.from(state.tasks.values()).filter(
    (t) => t.status === "completed" || t.status === "failed" || t.status === "cancelled"
  );

  for (const task of completed) {
    state.tasks.delete(task.id);
    await removePersistedTask(task.id);
  }

  return completed.length;
};

export const getTaskStatusIcon = (status: BackgroundTaskStatus): string =>
  BACKGROUND_TASK_STATUS_ICONS[status];

export const formatTaskSummary = (task: BackgroundTask): string => {
  const icon = getTaskStatusIcon(task.status);
  const progress = task.status === "running" ? ` (${task.progress.percentage}%)` : "";
  return `${icon} ${task.name}${progress} - ${task.description}`;
};

export const getQueueLength = (): number => state.queue.length;

export const getRunningCount = (): number => state.running.length;
