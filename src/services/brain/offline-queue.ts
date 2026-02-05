/**
 * Offline Queue
 *
 * Manages queued changes when offline for later synchronization.
 */

import fs from "fs/promises";
import { join } from "path";
import { DIRS } from "@constants/paths";
import { SYNC_CONFIG, CLOUD_ERRORS } from "@constants/brain-cloud";
import type {
  SyncItem,
  OfflineQueueItem,
  OfflineQueueState,
  SyncOperationType,
} from "@/types/brain-cloud";

// Queue file path
const getQueuePath = (): string => join(DIRS.data, "brain-offline-queue.json");

// In-memory queue state
let queueState: OfflineQueueState = {
  items: [],
  totalSize: 0,
  oldestItem: null,
};

let loaded = false;

/**
 * Load queue from disk
 */
export const loadQueue = async (): Promise<void> => {
  if (loaded) return;

  try {
    const data = await fs.readFile(getQueuePath(), "utf-8");
    const parsed = JSON.parse(data) as OfflineQueueState;
    queueState = parsed;
    loaded = true;
  } catch {
    // File doesn't exist or is invalid, start fresh
    queueState = {
      items: [],
      totalSize: 0,
      oldestItem: null,
    };
    loaded = true;
  }
};

/**
 * Save queue to disk
 */
const saveQueue = async (): Promise<void> => {
  try {
    await fs.mkdir(DIRS.data, { recursive: true });
    await fs.writeFile(getQueuePath(), JSON.stringify(queueState, null, 2));
  } catch (error) {
    console.error("Failed to save offline queue:", error);
  }
};

/**
 * Add item to offline queue
 */
export const enqueue = async (item: SyncItem): Promise<boolean> => {
  await loadQueue();

  // Check queue size limit
  if (queueState.items.length >= SYNC_CONFIG.MAX_QUEUE_SIZE) {
    throw new Error(CLOUD_ERRORS.QUEUE_FULL);
  }

  const queueItem: OfflineQueueItem = {
    id: generateQueueId(),
    item,
    retryCount: 0,
    lastAttempt: 0,
  };

  queueState.items.push(queueItem);
  queueState.totalSize = queueState.items.length;
  queueState.oldestItem = Math.min(
    queueState.oldestItem ?? item.timestamp,
    item.timestamp,
  );

  await saveQueue();
  return true;
};

/**
 * Add multiple items to queue
 */
export const enqueueBatch = async (items: SyncItem[]): Promise<number> => {
  await loadQueue();

  let added = 0;
  for (const item of items) {
    if (queueState.items.length >= SYNC_CONFIG.MAX_QUEUE_SIZE) {
      break;
    }

    const queueItem: OfflineQueueItem = {
      id: generateQueueId(),
      item,
      retryCount: 0,
      lastAttempt: 0,
    };

    queueState.items.push(queueItem);
    added++;
  }

  queueState.totalSize = queueState.items.length;
  if (added > 0) {
    queueState.oldestItem = Math.min(
      queueState.oldestItem ?? Date.now(),
      ...items.map((i) => i.timestamp),
    );
  }

  await saveQueue();
  return added;
};

/**
 * Get items from queue for processing
 */
export const dequeue = async (
  limit: number = SYNC_CONFIG.MAX_BATCH_SIZE,
): Promise<OfflineQueueItem[]> => {
  await loadQueue();

  // Get items that haven't exceeded retry limit
  const available = queueState.items.filter(
    (item) => item.retryCount < SYNC_CONFIG.MAX_QUEUE_SIZE,
  );

  return available.slice(0, limit);
};

/**
 * Mark items as processed (remove from queue)
 */
export const markProcessed = async (ids: string[]): Promise<void> => {
  await loadQueue();

  const idSet = new Set(ids);
  queueState.items = queueState.items.filter((item) => !idSet.has(item.id));
  queueState.totalSize = queueState.items.length;

  // Update oldest item
  if (queueState.items.length > 0) {
    queueState.oldestItem = Math.min(
      ...queueState.items.map((i) => i.item.timestamp),
    );
  } else {
    queueState.oldestItem = null;
  }

  await saveQueue();
};

/**
 * Mark items as failed (increment retry count)
 */
export const markFailed = async (
  ids: string[],
  error?: string,
): Promise<void> => {
  await loadQueue();

  const now = Date.now();
  for (const id of ids) {
    const item = queueState.items.find((i) => i.id === id);
    if (item) {
      item.retryCount++;
      item.lastAttempt = now;
      item.error = error;
    }
  }

  await saveQueue();
};

/**
 * Get queue state
 */
export const getQueueState = async (): Promise<OfflineQueueState> => {
  await loadQueue();
  return { ...queueState };
};

/**
 * Get queue size
 */
export const getQueueSize = async (): Promise<number> => {
  await loadQueue();
  return queueState.items.length;
};

/**
 * Check if queue has items
 */
export const hasQueuedItems = async (): Promise<boolean> => {
  await loadQueue();
  return queueState.items.length > 0;
};

/**
 * Clear the entire queue
 */
export const clearQueue = async (): Promise<void> => {
  queueState = {
    items: [],
    totalSize: 0,
    oldestItem: null,
  };
  await saveQueue();
};

/**
 * Remove stale items from queue
 */
export const pruneStaleItems = async (): Promise<number> => {
  await loadQueue();

  const cutoff = Date.now() - SYNC_CONFIG.STALE_ITEM_AGE_MS;
  const before = queueState.items.length;

  queueState.items = queueState.items.filter(
    (item) => item.item.timestamp > cutoff,
  );

  queueState.totalSize = queueState.items.length;
  const removed = before - queueState.items.length;

  if (removed > 0) {
    await saveQueue();
  }

  return removed;
};

/**
 * Get items by type
 */
export const getItemsByType = async (
  type: "concept" | "memory" | "relation",
): Promise<OfflineQueueItem[]> => {
  await loadQueue();
  return queueState.items.filter((item) => item.item.type === type);
};

/**
 * Get items by operation
 */
export const getItemsByOperation = async (
  operation: SyncOperationType,
): Promise<OfflineQueueItem[]> => {
  await loadQueue();
  return queueState.items.filter((item) => item.item.operation === operation);
};

/**
 * Generate unique queue item ID
 */
const generateQueueId = (): string => {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
