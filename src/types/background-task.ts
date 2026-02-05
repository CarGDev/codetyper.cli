export type BackgroundTaskStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type BackgroundTaskPriority = "low" | "normal" | "high";
