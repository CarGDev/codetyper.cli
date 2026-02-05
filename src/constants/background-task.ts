/**
 * Background task constants
 */

import { BackgroundTaskPriority } from "@/types/background-task";

import { BackgroundTaskConfig } from "@interfaces/BackgroundTask";

export const DEFAULT_BACKGROUND_TASK_CONFIG: BackgroundTaskConfig = {
  maxConcurrent: 3,
  defaultTimeout: 300000, // 5 minutes
  retryOnFailure: false,
  maxRetries: 1,
  notifyOnComplete: true,
  persistTasks: true,
};

export const BACKGROUND_TASK_PRIORITIES: Record<
  BackgroundTaskPriority,
  number
> = {
  low: 1,
  normal: 5,
  high: 10,
};

export const BACKGROUND_TASK = {
  MAX_CONCURRENT: 3,
  DEFAULT_TIMEOUT: 300000, // 5 minutes
  MAX_TIMEOUT: 3600000, // 1 hour
  POLL_INTERVAL: 1000, // 1 second
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
  HISTORY_LIMIT: 100,
} as const;

export const BACKGROUND_TASK_STORAGE = {
  DIRECTORY: ".codetyper/tasks",
  FILE_EXTENSION: ".json",
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

export const BACKGROUND_TASK_SHORTCUTS = {
  START: "ctrl+b",
  LIST: "ctrl+shift+b",
  CANCEL: "ctrl+shift+c",
  PAUSE: "ctrl+shift+p",
  RESUME: "ctrl+shift+r",
} as const;

export const BACKGROUND_TASK_COMMANDS = {
  START: "/background",
  LIST: "/tasks",
  CANCEL: "/task cancel",
  STATUS: "/task status",
  CLEAR: "/task clear",
} as const;

export const BACKGROUND_TASK_STATUS_ICONS = {
  pending: "\u23F3", // hourglass
  running: "\u25B6", // play
  paused: "\u23F8", // pause
  completed: "\u2705", // check
  failed: "\u274C", // cross
  cancelled: "\u23F9", // stop
} as const;

export const BACKGROUND_TASK_MESSAGES = {
  STARTED: "Task started in background",
  COMPLETED: "Background task completed",
  FAILED: "Background task failed",
  CANCELLED: "Background task cancelled",
  PAUSED: "Background task paused",
  RESUMED: "Background task resumed",
  QUEUE_FULL: "Task queue is full",
  NOT_FOUND: "Task not found",
  ALREADY_RUNNING: "Task is already running",
} as const;

export const BACKGROUND_TASK_NOTIFICATIONS = {
  SOUND_ENABLED: true,
  DESKTOP_ENABLED: true,
  INLINE_ENABLED: true,
} as const;
