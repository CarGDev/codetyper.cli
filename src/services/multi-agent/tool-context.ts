/**
 * Agent Tool Context
 *
 * Provides isolated tool execution context for each agent,
 * tracking file modifications and enforcing permissions.
 */

import type { AgentToolContext } from "@/types/multi-agent";
import { multiAgentStore } from "@stores/core/multi-agent-store";
import {
  acquireFileLock,
  releaseFileLock,
  releaseAllLocks,
  detectConflict,
} from "@/services/multi-agent/conflict-handler";

/**
 * Active tool contexts by agent ID
 */
const activeContexts: Map<string, AgentToolContext> = new Map();

/**
 * Create a tool context for an agent
 */
export const createToolContext = (
  agentId: string,
  workingDir: string,
  allowedPaths: string[] = [],
  deniedPaths: string[] = [],
): AgentToolContext => {
  const context: AgentToolContext = {
    agentId,
    workingDir,
    allowedPaths,
    deniedPaths,
    modifiedFiles: new Set(),
    lockedFiles: new Set(),
  };

  activeContexts.set(agentId, context);
  return context;
};

/**
 * Get tool context for an agent
 */
export const getToolContext = (agentId: string): AgentToolContext | null => {
  return activeContexts.get(agentId) ?? null;
};

/**
 * Check if a path is allowed for an agent
 */
export const isPathAllowed = (agentId: string, filePath: string): boolean => {
  const context = activeContexts.get(agentId);
  if (!context) return false;

  // Check denied paths first (higher priority)
  for (const denied of context.deniedPaths) {
    if (filePath.startsWith(denied)) {
      return false;
    }
  }

  // If no allowed paths specified, allow all (except denied)
  if (context.allowedPaths.length === 0) {
    return true;
  }

  // Check if path matches any allowed path
  for (const allowed of context.allowedPaths) {
    if (filePath.startsWith(allowed)) {
      return true;
    }
  }

  return false;
};

/**
 * Request write access to a file
 * Returns true if access granted, false if conflict or denied
 */
export const requestWriteAccess = async (
  agentId: string,
  filePath: string,
): Promise<{ granted: boolean; conflict?: boolean; reason?: string }> => {
  const context = activeContexts.get(agentId);
  if (!context) {
    return { granted: false, reason: "No active context for agent" };
  }

  // Check path permissions
  if (!isPathAllowed(agentId, filePath)) {
    return { granted: false, reason: "Path not allowed for this agent" };
  }

  // Detect conflicts with other agents
  const conflict = detectConflict(agentId, filePath);
  if (conflict) {
    return {
      granted: false,
      conflict: true,
      reason: "File locked by another agent",
    };
  }

  // Acquire file lock
  const acquired = await acquireFileLock(agentId, filePath);
  if (!acquired) {
    return {
      granted: false,
      conflict: true,
      reason: "Could not acquire file lock",
    };
  }

  // Track locked file
  context.lockedFiles.add(filePath);
  return { granted: true };
};

/**
 * Record a file modification
 */
export const recordModification = (agentId: string, filePath: string): void => {
  const context = activeContexts.get(agentId);
  if (!context) return;

  context.modifiedFiles.add(filePath);
  multiAgentStore.addModifiedFile(agentId, filePath);
};

/**
 * Release write access to a file
 */
export const releaseWriteAccess = (agentId: string, filePath: string): void => {
  const context = activeContexts.get(agentId);
  if (!context) return;

  context.lockedFiles.delete(filePath);
  releaseFileLock(agentId, filePath);
};

/**
 * Get all files modified by an agent
 */
export const getModifiedFiles = (agentId: string): string[] => {
  const context = activeContexts.get(agentId);
  if (!context) return [];

  return Array.from(context.modifiedFiles);
};

/**
 * Get all files currently locked by an agent
 */
export const getLockedFiles = (agentId: string): string[] => {
  const context = activeContexts.get(agentId);
  if (!context) return [];

  return Array.from(context.lockedFiles);
};

/**
 * Clean up tool context for an agent
 */
export const cleanupToolContext = (agentId: string): void => {
  const context = activeContexts.get(agentId);
  if (!context) return;

  // Release all locks
  releaseAllLocks(agentId);

  // Remove context
  activeContexts.delete(agentId);
};

/**
 * Clean up all tool contexts
 */
export const cleanupAllContexts = (): void => {
  activeContexts.forEach((_, agentId) => {
    cleanupToolContext(agentId);
  });
};

/**
 * Get context statistics
 */
export const getContextStats = (): {
  activeContexts: number;
  totalModifiedFiles: number;
  totalLockedFiles: number;
} => {
  let modifiedCount = 0;
  let lockedCount = 0;

  activeContexts.forEach((context) => {
    modifiedCount += context.modifiedFiles.size;
    lockedCount += context.lockedFiles.size;
  });

  return {
    activeContexts: activeContexts.size,
    totalModifiedFiles: modifiedCount,
    totalLockedFiles: lockedCount,
  };
};

/**
 * Create a wrapped tool executor that uses the agent context
 */
export const createContextualToolExecutor = <TArgs, TResult>(
  agentId: string,
  executor: (args: TArgs) => Promise<TResult>,
  options: {
    requiresWriteAccess?: (args: TArgs) => string | null;
  } = {},
): ((args: TArgs) => Promise<TResult>) => {
  return async (args: TArgs): Promise<TResult> => {
    // Check if write access is required
    if (options.requiresWriteAccess) {
      const filePath = options.requiresWriteAccess(args);
      if (filePath) {
        const access = await requestWriteAccess(agentId, filePath);
        if (!access.granted) {
          throw new Error(access.reason ?? "Write access denied");
        }
      }
    }

    // Execute the tool
    const result = await executor(args);

    return result;
  };
};
