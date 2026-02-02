/**
 * Brain Cloud Sync Constants
 *
 * Configuration for cloud synchronization of brain data.
 */

import type { CloudBrainConfig } from "@/types/brain-cloud";

/**
 * Default cloud configuration
 */
export const CLOUD_BRAIN_DEFAULTS: CloudBrainConfig = {
  enabled: false,
  endpoint: "https://brain.codetyper.dev/api/v1",
  syncOnSessionEnd: true,
  syncInterval: 300000, // 5 minutes
  conflictStrategy: "local-wins",
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

/**
 * Cloud API endpoints
 */
export const CLOUD_ENDPOINTS = {
  PUSH: "/sync/push",
  PULL: "/sync/pull",
  STATUS: "/sync/status",
  CONFLICTS: "/sync/conflicts",
  RESOLVE: "/sync/resolve",
  HEALTH: "/health",
} as const;

/**
 * Sync configuration
 */
export const SYNC_CONFIG = {
  MAX_BATCH_SIZE: 100,
  MAX_QUEUE_SIZE: 1000,
  STALE_ITEM_AGE_MS: 86400000, // 24 hours
  VERSION_KEY: "brain_sync_version",
  QUEUE_KEY: "brain_offline_queue",
} as const;

/**
 * Error messages
 */
export const CLOUD_ERRORS = {
  NOT_CONFIGURED: "Cloud sync is not configured",
  OFFLINE: "Device is offline",
  SYNC_IN_PROGRESS: "Sync already in progress",
  PUSH_FAILED: (error: string) => `Push failed: ${error}`,
  PULL_FAILED: (error: string) => `Pull failed: ${error}`,
  CONFLICT_UNRESOLVED: (count: number) =>
    `${count} conflict(s) require manual resolution`,
  QUEUE_FULL: "Offline queue is full",
  VERSION_MISMATCH: "Version mismatch - full sync required",
  AUTH_REQUIRED: "Authentication required for cloud sync",
  INVALID_RESPONSE: "Invalid response from server",
} as const;

/**
 * Status messages
 */
export const CLOUD_MESSAGES = {
  STARTING_SYNC: "Starting cloud sync...",
  PUSHING: (count: number) => `Pushing ${count} change(s)...`,
  PULLING: (count: number) => `Pulling ${count} change(s)...`,
  RESOLVING_CONFLICTS: (count: number) => `Resolving ${count} conflict(s)...`,
  SYNC_COMPLETE: "Cloud sync complete",
  SYNC_SKIPPED: "No changes to sync",
  QUEUED_OFFLINE: (count: number) => `Queued ${count} change(s) for later sync`,
  RETRYING: (attempt: number, max: number) =>
    `Retrying sync (${attempt}/${max})...`,
} as const;

/**
 * Titles for UI
 */
export const CLOUD_TITLES = {
  SYNCING: "Syncing with cloud",
  SYNCED: "Cloud sync complete",
  OFFLINE: "Offline - changes queued",
  CONFLICT: "Sync conflicts",
  ERROR: "Sync failed",
} as const;

/**
 * Conflict resolution labels
 */
export const CONFLICT_LABELS = {
  "local-wins": "Keep local version",
  "remote-wins": "Use remote version",
  manual: "Resolve manually",
  merge: "Attempt to merge",
} as const;

/**
 * HTTP request configuration
 */
export const CLOUD_HTTP_CONFIG = {
  TIMEOUT_MS: 30000,
  HEADERS: {
    "Content-Type": "application/json",
    "X-Client": "codetyper-cli",
  },
} as const;
