/**
 * Conflict Handler
 *
 * Detects and resolves file conflicts between concurrent agents.
 */

import type {
  FileConflict,
  ConflictStrategy,
  ConflictResolutionResult,
  AgentInstance,
} from "@/types/multi-agent";
import { multiAgentStore } from "@stores/core/multi-agent-store";
import { MULTI_AGENT_ERRORS, FILE_LOCK } from "@/constants/multi-agent";
import {
  pauseAgentForConflict,
  resumeAgent,
} from "@/services/multi-agent/agent-manager";

/**
 * File locks for tracking which agent owns which file
 */
const fileLocks: Map<string, string> = new Map(); // filePath -> agentId

/**
 * Pending lock requests
 */
const pendingLocks: Map<
  string,
  Array<{
    agentId: string;
    resolve: (acquired: boolean) => void;
  }>
> = new Map();

/**
 * Acquire a file lock for an agent
 */
export const acquireFileLock = async (
  agentId: string,
  filePath: string,
): Promise<boolean> => {
  const currentOwner = fileLocks.get(filePath);

  if (!currentOwner) {
    fileLocks.set(filePath, agentId);
    return true;
  }

  if (currentOwner === agentId) {
    return true;
  }

  // File is locked by another agent - add to pending queue
  return new Promise((resolve) => {
    const pending = pendingLocks.get(filePath) ?? [];
    pending.push({ agentId, resolve });
    pendingLocks.set(filePath, pending);

    // Set timeout for lock acquisition
    setTimeout(() => {
      const queue = pendingLocks.get(filePath) ?? [];
      const idx = queue.findIndex((p) => p.agentId === agentId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        pendingLocks.set(filePath, queue);
        resolve(false);
      }
    }, FILE_LOCK.acquireTimeout);
  });
};

/**
 * Release a file lock
 */
export const releaseFileLock = (agentId: string, filePath: string): void => {
  const currentOwner = fileLocks.get(filePath);
  if (currentOwner !== agentId) return;

  fileLocks.delete(filePath);

  // Grant lock to next pending agent
  const pending = pendingLocks.get(filePath) ?? [];
  if (pending.length > 0) {
    const next = pending.shift();
    if (next) {
      pendingLocks.set(filePath, pending);
      fileLocks.set(filePath, next.agentId);
      next.resolve(true);
    }
  }
};

/**
 * Release all locks held by an agent
 */
export const releaseAllLocks = (agentId: string): void => {
  const locksToRelease: string[] = [];

  fileLocks.forEach((owner, path) => {
    if (owner === agentId) {
      locksToRelease.push(path);
    }
  });

  locksToRelease.forEach((path) => releaseFileLock(agentId, path));
};

/**
 * Check if a file is locked
 */
export const isFileLocked = (filePath: string): boolean => {
  return fileLocks.has(filePath);
};

/**
 * Get the agent that holds a file lock
 */
export const getFileLockOwner = (filePath: string): string | null => {
  return fileLocks.get(filePath) ?? null;
};

/**
 * Detect conflict when agent tries to modify a file
 */
export const detectConflict = (
  agentId: string,
  filePath: string,
): FileConflict | null => {
  const currentOwner = fileLocks.get(filePath);

  if (!currentOwner || currentOwner === agentId) {
    return null;
  }

  const conflict: FileConflict = {
    filePath,
    conflictingAgentIds: [currentOwner, agentId],
    detectedAt: Date.now(),
  };

  multiAgentStore.addConflict(conflict);
  return conflict;
};

/**
 * Resolve conflict using specified strategy
 */
export const resolveConflict = async (
  conflict: FileConflict,
  strategy: ConflictStrategy,
): Promise<ConflictResolutionResult> => {
  const resolutionHandlers: Record<
    ConflictStrategy,
    () => Promise<ConflictResolutionResult>
  > = {
    serialize: () => handleSerializeStrategy(conflict),
    "abort-newer": () => handleAbortNewerStrategy(conflict),
    "merge-results": () => handleMergeStrategy(conflict),
    isolated: () => handleIsolatedStrategy(conflict),
  };

  const result = await resolutionHandlers[strategy]();
  multiAgentStore.resolveConflict(conflict.filePath, result);

  return result;
};

/**
 * Handle serialize strategy - wait for owner to finish
 */
const handleSerializeStrategy = async (
  conflict: FileConflict,
): Promise<ConflictResolutionResult> => {
  const [ownerAgentId, waitingAgentId] = conflict.conflictingAgentIds;

  // Pause the waiting agent
  pauseAgentForConflict(waitingAgentId);

  // Wait for owner to complete
  await waitForAgentCompletion(ownerAgentId);

  // Resume waiting agent
  resumeAgent(waitingAgentId);

  return {
    strategy: "serialize",
    winningAgentId: ownerAgentId,
    resolvedAt: Date.now(),
  };
};

/**
 * Handle abort-newer strategy - abort the agent that started later
 */
const handleAbortNewerStrategy = async (
  conflict: FileConflict,
): Promise<ConflictResolutionResult> => {
  const state = multiAgentStore.getState();
  const agents = conflict.conflictingAgentIds
    .map((id) => state.instances.get(id))
    .filter((a): a is AgentInstance => a !== undefined);

  // Sort by start time, newer agent is cancelled
  agents.sort((a, b) => a.startedAt - b.startedAt);
  const olderAgent = agents[0];
  const newerAgent = agents[1];

  if (newerAgent) {
    multiAgentStore.updateInstanceStatus(
      newerAgent.id,
      "cancelled",
      MULTI_AGENT_ERRORS.CONFLICT_RESOLUTION_FAILED(conflict.filePath),
    );
  }

  return {
    strategy: "abort-newer",
    winningAgentId: olderAgent?.id,
    resolvedAt: Date.now(),
  };
};

/**
 * Handle merge strategy - placeholder for merge logic
 */
const handleMergeStrategy = async (
  _conflict: FileConflict,
): Promise<ConflictResolutionResult> => {
  // Merge strategy requires comparing file contents and intelligently
  // combining changes. This is a placeholder - actual implementation
  // would need diff/patch logic.
  return {
    strategy: "merge-results",
    resolvedAt: Date.now(),
  };
};

/**
 * Handle isolated strategy - each agent works in isolation
 */
const handleIsolatedStrategy = async (
  _conflict: FileConflict,
): Promise<ConflictResolutionResult> => {
  // In isolated mode, conflicts are expected and handled at merge time
  return {
    strategy: "isolated",
    resolvedAt: Date.now(),
  };
};

/**
 * Wait for an agent to complete
 */
const waitForAgentCompletion = (agentId: string): Promise<void> => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const agent = multiAgentStore.getState().instances.get(agentId);
      if (
        !agent ||
        ["completed", "error", "cancelled"].includes(agent.status)
      ) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
};

/**
 * Get all current conflicts for an agent
 */
export const getConflictsForAgent = (agentId: string): FileConflict[] => {
  const conflicts = multiAgentStore.getUnresolvedConflicts();
  return conflicts.filter((c) => c.conflictingAgentIds.includes(agentId));
};

/**
 * Clear all file locks (for cleanup)
 */
export const clearAllLocks = (): void => {
  fileLocks.clear();
  pendingLocks.clear();
};

/**
 * Get lock statistics
 */
export const getLockStats = (): {
  lockedFiles: number;
  pendingRequests: number;
} => {
  let pendingCount = 0;
  pendingLocks.forEach((pending) => {
    pendingCount += pending.length;
  });

  return {
    lockedFiles: fileLocks.size,
    pendingRequests: pendingCount,
  };
};
