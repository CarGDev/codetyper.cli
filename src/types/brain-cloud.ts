/**
 * Brain Cloud Sync Types
 *
 * Types for cloud synchronization of brain data.
 */

/**
 * Sync status
 */
export type BrainSyncStatus =
  | "synced"
  | "pending"
  | "syncing"
  | "conflict"
  | "offline"
  | "error";

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy =
  | "local-wins"
  | "remote-wins"
  | "manual"
  | "merge";

/**
 * Sync direction
 */
export type SyncDirection = "push" | "pull" | "both";

/**
 * Sync operation type
 */
export type SyncOperationType = "create" | "update" | "delete" | "conflict";

/**
 * Brain sync state
 */
export interface BrainSyncState {
  status: BrainSyncStatus;
  lastSyncAt: number | null;
  lastPushAt: number | null;
  lastPullAt: number | null;
  pendingChanges: number;
  conflictCount: number;
  syncErrors: string[];
}

/**
 * Cloud brain configuration
 */
export interface CloudBrainConfig {
  enabled: boolean;
  endpoint: string;
  syncOnSessionEnd: boolean;
  syncInterval: number;
  conflictStrategy: ConflictStrategy;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Sync item representing a change
 */
export interface SyncItem {
  id: string;
  type: "concept" | "memory" | "relation";
  operation: SyncOperationType;
  localVersion: number;
  remoteVersion?: number;
  data: unknown;
  timestamp: number;
  synced: boolean;
}

/**
 * Sync conflict
 */
export interface SyncConflict {
  id: string;
  itemId: string;
  itemType: "concept" | "memory" | "relation";
  localData: unknown;
  remoteData: unknown;
  localVersion: number;
  remoteVersion: number;
  localTimestamp: number;
  remoteTimestamp: number;
  resolved: boolean;
  resolution?: ConflictStrategy;
  resolvedData?: unknown;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  itemsSynced: number;
  itemsFailed: number;
  conflicts: SyncConflict[];
  errors: string[];
  duration: number;
  timestamp: number;
}

/**
 * Push request
 */
export interface PushRequest {
  items: SyncItem[];
  projectId: number;
  clientVersion: string;
}

/**
 * Push response
 */
export interface PushResponse {
  success: boolean;
  accepted: number;
  rejected: number;
  conflicts: SyncConflict[];
  serverVersion: number;
  errors?: string[];
}

/**
 * Pull request
 */
export interface PullRequest {
  projectId: number;
  sinceVersion: number;
  sinceTimestamp: number;
  limit?: number;
}

/**
 * Pull response
 */
export interface PullResponse {
  success: boolean;
  items: SyncItem[];
  serverVersion: number;
  hasMore: boolean;
  errors?: string[];
}

/**
 * Offline queue item
 */
export interface OfflineQueueItem {
  id: string;
  item: SyncItem;
  retryCount: number;
  lastAttempt: number;
  error?: string;
}

/**
 * Offline queue state
 */
export interface OfflineQueueState {
  items: OfflineQueueItem[];
  totalSize: number;
  oldestItem: number | null;
}

/**
 * Sync progress event
 */
export interface SyncProgressEvent {
  phase: "preparing" | "pushing" | "pulling" | "resolving" | "completing";
  current: number;
  total: number;
  message: string;
}

/**
 * Sync options
 */
export interface SyncOptions {
  direction?: SyncDirection;
  force?: boolean;
  conflictStrategy?: ConflictStrategy;
  onProgress?: (event: SyncProgressEvent) => void;
  abortSignal?: AbortSignal;
}
