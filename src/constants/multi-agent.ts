/**
 * Multi-Agent Constants
 *
 * Configuration defaults, messages, and descriptions for multi-agent execution.
 */

import type { AgentExecutionMode, ConflictStrategy } from "@/types/multi-agent";

/**
 * Default configuration values
 */
export const MULTI_AGENT_DEFAULTS = {
  maxConcurrent: 3,
  timeout: 300000, // 5 minutes
  executionMode: "adaptive" as AgentExecutionMode,
  conflictStrategy: "serialize" as ConflictStrategy,
  abortOnFirstError: false,
  conflictCheckInterval: 1000, // 1 second
  maxRetries: 2,
} as const;

/**
 * Resource limits
 */
export const MULTI_AGENT_LIMITS = {
  maxAgentsPerRequest: 10,
  maxConcurrentRequests: 3,
  maxQueuedAgents: 20,
  maxConflictsBeforeAbort: 5,
} as const;

/**
 * Execution mode descriptions
 */
export const EXECUTION_MODE_DESCRIPTIONS: Record<AgentExecutionMode, string> = {
  sequential: "Execute agents one after another, safest for file modifications",
  parallel: "Execute all agents concurrently, fastest but may cause conflicts",
  adaptive: "Start parallel, automatically serialize when conflicts detected",
} as const;

/**
 * Conflict strategy descriptions
 */
export const CONFLICT_STRATEGY_DESCRIPTIONS: Record<ConflictStrategy, string> = {
  serialize: "Wait for conflicting agent to complete before proceeding",
  "abort-newer": "Abort the agent that started later when conflict detected",
  "merge-results": "Attempt to merge changes from both agents",
  isolated: "Each agent works in isolated context, merge at end",
} as const;

/**
 * Error messages
 */
export const MULTI_AGENT_ERRORS = {
  MAX_AGENTS_EXCEEDED: (max: number) =>
    `Cannot spawn more than ${max} agents in a single request`,
  MAX_CONCURRENT_EXCEEDED: (max: number) =>
    `Maximum concurrent agents (${max}) reached`,
  AGENT_NOT_FOUND: (name: string) =>
    `Agent "${name}" not found in registry`,
  AGENT_ALREADY_RUNNING: (id: string) =>
    `Agent "${id}" is already running`,
  EXECUTION_TIMEOUT: (agentId: string, timeout: number) =>
    `Agent "${agentId}" timed out after ${timeout}ms`,
  CONFLICT_RESOLUTION_FAILED: (filePath: string) =>
    `Failed to resolve conflict for file: ${filePath}`,
  EXECUTION_ABORTED: "Execution aborted by user",
  INVALID_EXECUTION_MODE: (mode: string) =>
    `Invalid execution mode: ${mode}`,
  INVALID_CONFLICT_STRATEGY: (strategy: string) =>
    `Invalid conflict strategy: ${strategy}`,
  TOO_MANY_CONFLICTS: (count: number) =>
    `Too many conflicts detected (${count}), aborting execution`,
} as const;

/**
 * Status messages
 */
export const MULTI_AGENT_MESSAGES = {
  STARTING: "Starting multi-agent execution",
  AGENT_SPAWNED: (name: string) => `Spawned agent: ${name}`,
  AGENT_COMPLETED: (name: string) => `Agent completed: ${name}`,
  AGENT_FAILED: (name: string, error: string) =>
    `Agent failed: ${name} - ${error}`,
  CONFLICT_DETECTED: (file: string, agents: string[]) =>
    `Conflict detected on ${file} between agents: ${agents.join(", ")}`,
  CONFLICT_RESOLVED: (file: string, strategy: string) =>
    `Conflict resolved for ${file} using ${strategy}`,
  EXECUTION_COMPLETE: (success: number, failed: number) =>
    `Execution complete: ${success} succeeded, ${failed} failed`,
  WAITING_FOR_CONFLICT: (agentId: string) =>
    `Agent ${agentId} waiting for conflict resolution`,
} as const;

/**
 * Agent ID generation prefix
 */
export const AGENT_ID_PREFIX = "agent_";

/**
 * Request ID generation prefix
 */
export const REQUEST_ID_PREFIX = "req_";

/**
 * File lock constants
 */
export const FILE_LOCK = {
  acquireTimeout: 5000, // 5 seconds
  retryInterval: 100, // 100ms
  maxRetries: 50,
} as const;
