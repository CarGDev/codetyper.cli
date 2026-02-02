/**
 * Cloud Sync Service
 *
 * Handles push/pull synchronization with the cloud brain service.
 */

import {
  CLOUD_BRAIN_DEFAULTS,
  CLOUD_ENDPOINTS,
  CLOUD_ERRORS,
  CLOUD_MESSAGES,
  CLOUD_HTTP_CONFIG,
  SYNC_CONFIG,
} from "@constants/brain-cloud";
import {
  enqueue,
  enqueueBatch,
  dequeue,
  markProcessed,
  markFailed,
  hasQueuedItems,
  getQueueSize,
  clearQueue,
} from "@services/brain/offline-queue";
import {
  createConflict,
  resolveAllConflicts,
  getPendingConflicts,
  hasUnresolvedConflicts,
  clearResolvedConflicts,
} from "@services/brain/conflict-resolver";
import type {
  BrainSyncState,
  CloudBrainConfig,
  SyncItem,
  SyncResult,
  SyncOptions,
  PushRequest,
  PushResponse,
  PullRequest,
  PullResponse,
} from "@/types/brain-cloud";

// Sync state
let syncState: BrainSyncState = {
  status: "synced",
  lastSyncAt: null,
  lastPushAt: null,
  lastPullAt: null,
  pendingChanges: 0,
  conflictCount: 0,
  syncErrors: [],
};

// Cloud configuration
let cloudConfig: CloudBrainConfig = { ...CLOUD_BRAIN_DEFAULTS };

// Sync lock to prevent concurrent syncs
let syncInProgress = false;

// Local version tracking
let localVersion = 0;

/**
 * Configure cloud sync
 */
export const configure = (config: Partial<CloudBrainConfig>): void => {
  cloudConfig = { ...cloudConfig, ...config };
};

/**
 * Get current sync state
 */
export const getSyncState = (): BrainSyncState => ({ ...syncState });

/**
 * Get cloud configuration
 */
export const getConfig = (): CloudBrainConfig => ({ ...cloudConfig });

/**
 * Check if cloud sync is enabled
 */
export const isEnabled = (): boolean => cloudConfig.enabled;

/**
 * Check if device is online
 */
const isOnline = (): boolean => {
  // In Node.js/Bun, we'll assume online unless proven otherwise
  return true;
};

/**
 * Perform a full sync (push then pull)
 */
export const sync = async (
  authToken: string,
  projectId: number,
  options: SyncOptions = {},
): Promise<SyncResult> => {
  if (!cloudConfig.enabled) {
    throw new Error(CLOUD_ERRORS.NOT_CONFIGURED);
  }

  if (syncInProgress) {
    throw new Error(CLOUD_ERRORS.SYNC_IN_PROGRESS);
  }

  if (!isOnline()) {
    syncState.status = "offline";
    throw new Error(CLOUD_ERRORS.OFFLINE);
  }

  syncInProgress = true;
  syncState.status = "syncing";
  syncState.syncErrors = [];

  const startTime = Date.now();
  const result: SyncResult = {
    success: true,
    direction: options.direction ?? "both",
    itemsSynced: 0,
    itemsFailed: 0,
    conflicts: [],
    errors: [],
    duration: 0,
    timestamp: startTime,
  };

  try {
    const direction = options.direction ?? "both";

    // Push local changes
    if (direction === "push" || direction === "both") {
      options.onProgress?.({
        phase: "pushing",
        current: 0,
        total: await getQueueSize(),
        message: CLOUD_MESSAGES.STARTING_SYNC,
      });

      const pushResult = await pushChanges(authToken, projectId, options);
      result.itemsSynced += pushResult.itemsSynced;
      result.itemsFailed += pushResult.itemsFailed;
      result.conflicts.push(...pushResult.conflicts);
      result.errors.push(...pushResult.errors);

      if (pushResult.errors.length > 0) {
        result.success = false;
      }
    }

    // Pull remote changes
    if (direction === "pull" || direction === "both") {
      options.onProgress?.({
        phase: "pulling",
        current: 0,
        total: 0,
        message: CLOUD_MESSAGES.PULLING(0),
      });

      const pullResult = await pullChanges(authToken, projectId, options);
      result.itemsSynced += pullResult.itemsSynced;
      result.itemsFailed += pullResult.itemsFailed;
      result.conflicts.push(...pullResult.conflicts);
      result.errors.push(...pullResult.errors);

      if (pullResult.errors.length > 0) {
        result.success = false;
      }
    }

    // Handle conflicts if any
    if (result.conflicts.length > 0) {
      options.onProgress?.({
        phase: "resolving",
        current: 0,
        total: result.conflicts.length,
        message: CLOUD_MESSAGES.RESOLVING_CONFLICTS(result.conflicts.length),
      });

      const strategy = options.conflictStrategy ?? cloudConfig.conflictStrategy;

      if (strategy !== "manual") {
        resolveAllConflicts(strategy);
        result.conflicts = getPendingConflicts();
      }

      if (hasUnresolvedConflicts()) {
        syncState.status = "conflict";
        syncState.conflictCount = result.conflicts.length;
      }
    }

    // Update state
    result.duration = Date.now() - startTime;

    if (result.success && result.conflicts.length === 0) {
      syncState.status = "synced";
      syncState.lastSyncAt = Date.now();
    } else if (result.conflicts.length > 0) {
      syncState.status = "conflict";
    } else {
      syncState.status = "error";
    }

    syncState.pendingChanges = await getQueueSize();
    syncState.syncErrors = result.errors;

    options.onProgress?.({
      phase: "completing",
      current: result.itemsSynced,
      total: result.itemsSynced,
      message: CLOUD_MESSAGES.SYNC_COMPLETE,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    syncState.status = "error";
    syncState.syncErrors.push(message);

    result.success = false;
    result.errors.push(message);
    result.duration = Date.now() - startTime;

    return result;
  } finally {
    syncInProgress = false;
    clearResolvedConflicts();
  }
};

/**
 * Push local changes to cloud
 */
const pushChanges = async (
  authToken: string,
  projectId: number,
  options: SyncOptions,
): Promise<Omit<SyncResult, "direction" | "timestamp">> => {
  const result = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    conflicts: [] as SyncResult["conflicts"],
    errors: [] as string[],
    duration: 0,
  };

  // Get queued items
  const queuedItems = await dequeue(SYNC_CONFIG.MAX_BATCH_SIZE);

  if (queuedItems.length === 0) {
    return result;
  }

  options.onProgress?.({
    phase: "pushing",
    current: 0,
    total: queuedItems.length,
    message: CLOUD_MESSAGES.PUSHING(queuedItems.length),
  });

  const items = queuedItems.map((q) => q.item);

  try {
    const response = await pushToCloud(authToken, projectId, items);

    if (response.success) {
      result.itemsSynced = response.accepted;
      result.itemsFailed = response.rejected;

      // Mark successful items as processed
      const successIds = queuedItems
        .slice(0, response.accepted)
        .map((q) => q.id);
      await markProcessed(successIds);

      // Handle conflicts
      for (const conflict of response.conflicts) {
        result.conflicts.push(conflict);
      }

      syncState.lastPushAt = Date.now();
    } else {
      result.success = false;
      result.errors.push(...(response.errors ?? []));

      // Mark all as failed
      await markFailed(
        queuedItems.map((q) => q.id),
        response.errors?.[0],
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.success = false;
    result.errors.push(CLOUD_ERRORS.PUSH_FAILED(message));

    // Queue for retry
    await markFailed(
      queuedItems.map((q) => q.id),
      message,
    );
  }

  return result;
};

/**
 * Pull remote changes from cloud
 */
const pullChanges = async (
  authToken: string,
  projectId: number,
  options: SyncOptions,
): Promise<Omit<SyncResult, "direction" | "timestamp">> => {
  const result = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    conflicts: [] as SyncResult["conflicts"],
    errors: [] as string[],
    duration: 0,
  };

  try {
    const response = await pullFromCloud(
      authToken,
      projectId,
      localVersion,
      syncState.lastPullAt ?? 0,
    );

    if (response.success) {
      options.onProgress?.({
        phase: "pulling",
        current: response.items.length,
        total: response.items.length,
        message: CLOUD_MESSAGES.PULLING(response.items.length),
      });

      // Process pulled items
      for (const item of response.items) {
        // Check for conflicts with local changes
        const hasConflict = await checkLocalConflict(item);

        if (hasConflict) {
          // Create conflict entry
          const localItem = await getLocalItem(item.id, item.type);
          if (localItem) {
            const conflict = createConflict(localItem, item);
            result.conflicts.push(conflict);
          }
        } else {
          // Apply remote change locally
          await applyRemoteChange(item);
          result.itemsSynced++;
        }
      }

      // Update local version
      localVersion = response.serverVersion;
      syncState.lastPullAt = Date.now();
    } else {
      result.success = false;
      result.errors.push(...(response.errors ?? []));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.success = false;
    result.errors.push(CLOUD_ERRORS.PULL_FAILED(message));
  }

  return result;
};

/**
 * Push items to cloud API
 */
const pushToCloud = async (
  authToken: string,
  projectId: number,
  items: SyncItem[],
): Promise<PushResponse> => {
  const url = `${cloudConfig.endpoint}${CLOUD_ENDPOINTS.PUSH}`;

  const request: PushRequest = {
    items,
    projectId,
    clientVersion: "1.0.0",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...CLOUD_HTTP_CONFIG.HEADERS,
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(CLOUD_HTTP_CONFIG.TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<PushResponse>;
};

/**
 * Pull items from cloud API
 */
const pullFromCloud = async (
  authToken: string,
  projectId: number,
  sinceVersion: number,
  sinceTimestamp: number,
): Promise<PullResponse> => {
  const url = `${cloudConfig.endpoint}${CLOUD_ENDPOINTS.PULL}`;

  const request: PullRequest = {
    projectId,
    sinceVersion,
    sinceTimestamp,
    limit: SYNC_CONFIG.MAX_BATCH_SIZE,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...CLOUD_HTTP_CONFIG.HEADERS,
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(CLOUD_HTTP_CONFIG.TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<PullResponse>;
};

/**
 * Check if pulled item conflicts with local changes
 */
const checkLocalConflict = async (
  _item: SyncItem,
): Promise<boolean> => {
  // Check if we have pending changes for this item
  const queued = await hasQueuedItems();
  return queued;
};

/**
 * Get local item by ID and type
 */
const getLocalItem = async (
  _id: string,
  _type: "concept" | "memory" | "relation",
): Promise<SyncItem | null> => {
  // This would retrieve the local item from the brain service
  // Placeholder implementation
  return null;
};

/**
 * Apply a remote change locally
 */
const applyRemoteChange = async (_item: SyncItem): Promise<void> => {
  // This would apply the change to the local brain storage
  // Placeholder implementation
};

/**
 * Queue a change for sync
 */
export const queueChange = async (item: SyncItem): Promise<void> => {
  await enqueue(item);
  syncState.pendingChanges = await getQueueSize();
  syncState.status = "pending";
};

/**
 * Queue multiple changes
 */
export const queueChanges = async (items: SyncItem[]): Promise<number> => {
  const added = await enqueueBatch(items);
  syncState.pendingChanges = await getQueueSize();
  syncState.status = "pending";
  return added;
};

/**
 * Force sync now
 */
export const syncNow = async (
  authToken: string,
  projectId: number,
): Promise<SyncResult> => {
  return sync(authToken, projectId, { force: true });
};

/**
 * Reset sync state
 */
export const resetSyncState = async (): Promise<void> => {
  await clearQueue();
  syncState = {
    status: "synced",
    lastSyncAt: null,
    lastPushAt: null,
    lastPullAt: null,
    pendingChanges: 0,
    conflictCount: 0,
    syncErrors: [],
  };
  localVersion = 0;
};
