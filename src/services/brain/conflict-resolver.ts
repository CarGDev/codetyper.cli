/**
 * Conflict Resolver
 *
 * Handles sync conflicts between local and remote brain data.
 */

import { CONFLICT_LABELS } from "@constants/brain-cloud";
import type {
  SyncConflict,
  ConflictStrategy,
  SyncItem,
} from "@/types/brain-cloud";

// In-memory conflict storage
const pendingConflicts = new Map<string, SyncConflict>();

/**
 * Create a conflict from local and remote items
 */
export const createConflict = (
  localItem: SyncItem,
  remoteItem: SyncItem,
): SyncConflict => {
  const conflict: SyncConflict = {
    id: generateConflictId(),
    itemId: localItem.id,
    itemType: localItem.type,
    localData: localItem.data,
    remoteData: remoteItem.data,
    localVersion: localItem.localVersion,
    remoteVersion: remoteItem.remoteVersion ?? 0,
    localTimestamp: localItem.timestamp,
    remoteTimestamp: remoteItem.timestamp,
    resolved: false,
  };

  pendingConflicts.set(conflict.id, conflict);
  return conflict;
};

/**
 * Resolve a conflict using the specified strategy
 */
export const resolveConflict = (
  conflictId: string,
  strategy: ConflictStrategy,
): SyncConflict | null => {
  const conflict = pendingConflicts.get(conflictId);
  if (!conflict) return null;

  const resolver = resolvers[strategy];
  const resolvedData = resolver(conflict);

  conflict.resolved = true;
  conflict.resolution = strategy;
  conflict.resolvedData = resolvedData;

  return conflict;
};

/**
 * Resolve all pending conflicts with a single strategy
 */
export const resolveAllConflicts = (
  strategy: ConflictStrategy,
): SyncConflict[] => {
  const resolved: SyncConflict[] = [];

  for (const [id, conflict] of pendingConflicts) {
    if (!conflict.resolved) {
      const result = resolveConflict(id, strategy);
      if (result) {
        resolved.push(result);
      }
    }
  }

  return resolved;
};

/**
 * Conflict resolution strategies
 */
const resolvers: Record<ConflictStrategy, (conflict: SyncConflict) => unknown> =
  {
    "local-wins": (conflict) => conflict.localData,

    "remote-wins": (conflict) => conflict.remoteData,

    manual: (_conflict) => {
      // Manual resolution returns null - requires user input
      return null;
    },

    merge: (conflict) => {
      // Attempt to merge the data
      return mergeData(conflict.localData, conflict.remoteData);
    },
  };

/**
 * Attempt to merge two data objects
 */
const mergeData = (local: unknown, remote: unknown): unknown => {
  // If both are objects, merge their properties
  if (isObject(local) && isObject(remote)) {
    const localObj = local as Record<string, unknown>;
    const remoteObj = remote as Record<string, unknown>;

    const merged: Record<string, unknown> = { ...remoteObj };

    for (const key of Object.keys(localObj)) {
      // Local wins for non-timestamp fields that differ
      if (key !== "updatedAt" && key !== "timestamp") {
        merged[key] = localObj[key];
      }
    }

    // Use most recent timestamp
    const localTime = (localObj.updatedAt ?? localObj.timestamp ?? 0) as number;
    const remoteTime = (remoteObj.updatedAt ??
      remoteObj.timestamp ??
      0) as number;
    merged.updatedAt = Math.max(localTime, remoteTime);

    return merged;
  }

  // For non-objects, prefer local (or most recent)
  return local;
};

/**
 * Check if value is an object
 */
const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Get pending conflicts
 */
export const getPendingConflicts = (): SyncConflict[] => {
  return Array.from(pendingConflicts.values()).filter((c) => !c.resolved);
};

/**
 * Get all conflicts
 */
export const getAllConflicts = (): SyncConflict[] => {
  return Array.from(pendingConflicts.values());
};

/**
 * Get conflict by ID
 */
export const getConflict = (id: string): SyncConflict | undefined => {
  return pendingConflicts.get(id);
};

/**
 * Clear resolved conflicts
 */
export const clearResolvedConflicts = (): number => {
  let cleared = 0;

  for (const [id, conflict] of pendingConflicts) {
    if (conflict.resolved) {
      pendingConflicts.delete(id);
      cleared++;
    }
  }

  return cleared;
};

/**
 * Clear all conflicts
 */
export const clearAllConflicts = (): void => {
  pendingConflicts.clear();
};

/**
 * Get conflict count
 */
export const getConflictCount = (): number => {
  return getPendingConflicts().length;
};

/**
 * Check if there are unresolved conflicts
 */
export const hasUnresolvedConflicts = (): boolean => {
  return getPendingConflicts().length > 0;
};

/**
 * Get suggested resolution for a conflict
 */
export const suggestResolution = (conflict: SyncConflict): ConflictStrategy => {
  // If remote is newer, suggest remote-wins
  if (conflict.remoteTimestamp > conflict.localTimestamp) {
    return "remote-wins";
  }

  // If local is newer, suggest local-wins
  if (conflict.localTimestamp > conflict.remoteTimestamp) {
    return "local-wins";
  }

  // If timestamps are equal, try merge
  return "merge";
};

/**
 * Format conflict for display
 */
export const formatConflict = (conflict: SyncConflict): string => {
  const lines: string[] = [];

  lines.push(`**Conflict: ${conflict.itemId}**`);
  lines.push(`Type: ${conflict.itemType}`);
  lines.push(`Local version: ${conflict.localVersion}`);
  lines.push(`Remote version: ${conflict.remoteVersion}`);
  lines.push("");
  lines.push("Local data:");
  lines.push("```json");
  lines.push(JSON.stringify(conflict.localData, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("Remote data:");
  lines.push("```json");
  lines.push(JSON.stringify(conflict.remoteData, null, 2));
  lines.push("```");

  if (conflict.resolved) {
    lines.push("");
    lines.push(`Resolution: ${CONFLICT_LABELS[conflict.resolution!]}`);
  }

  return lines.join("\n");
};

/**
 * Generate unique conflict ID
 */
const generateConflictId = (): string => {
  return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
