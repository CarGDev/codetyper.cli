/**
 * Agent Manager
 *
 * Manages agent instance lifecycle: creation, starting, stopping, and cleanup.
 */

import type {
  AgentInstance,
  AgentSpawnConfig,
  AgentConversation,
  AgentExecutionResult,
} from "@/types/multi-agent";
import type { AgentDefinition } from "@/types/agent-definition";
import { multiAgentStore } from "@stores/core/multi-agent-store";
import {
  MULTI_AGENT_ERRORS,
  MULTI_AGENT_DEFAULTS,
  MULTI_AGENT_LIMITS,
} from "@/constants/multi-agent";

/**
 * Agent registry cache
 */
let agentRegistry: Map<string, AgentDefinition> = new Map();

/**
 * Set the agent registry (called during initialization)
 */
export const setAgentRegistry = (
  registry: Map<string, AgentDefinition>,
): void => {
  agentRegistry = registry;
};

/**
 * Get agent definition by name
 */
export const getAgentDefinition = (
  name: string,
): AgentDefinition | undefined => {
  return agentRegistry.get(name);
};

/**
 * Create an agent instance from config
 */
export const createAgentInstance = (
  config: AgentSpawnConfig,
): AgentInstance | { error: string } => {
  const definition = getAgentDefinition(config.agentName);
  if (!definition) {
    return { error: MULTI_AGENT_ERRORS.AGENT_NOT_FOUND(config.agentName) };
  }

  const activeCount = multiAgentStore.getActiveInstances().length;
  if (activeCount >= MULTI_AGENT_LIMITS.maxConcurrentRequests) {
    return {
      error: MULTI_AGENT_ERRORS.MAX_CONCURRENT_EXCEEDED(
        MULTI_AGENT_LIMITS.maxConcurrentRequests,
      ),
    };
  }

  const conversation: AgentConversation = {
    messages: [],
    toolCalls: [],
  };

  const instance: Omit<AgentInstance, "id"> = {
    definition,
    config,
    status: "pending",
    conversation,
    startedAt: Date.now(),
    modifiedFiles: [],
  };

  const id = multiAgentStore.addInstance(instance);

  return {
    ...instance,
    id,
  } as AgentInstance;
};

/**
 * Start an agent instance
 */
export const startAgent = (agentId: string): void => {
  multiAgentStore.updateInstanceStatus(agentId, "running");
};

/**
 * Pause agent due to conflict
 */
export const pauseAgentForConflict = (agentId: string): void => {
  multiAgentStore.updateInstanceStatus(agentId, "waiting_conflict");
};

/**
 * Resume agent after conflict resolution
 */
export const resumeAgent = (agentId: string): void => {
  const instance = multiAgentStore.getState().instances.get(agentId);
  if (instance?.status === "waiting_conflict") {
    multiAgentStore.updateInstanceStatus(agentId, "running");
  }
};

/**
 * Complete an agent with result
 */
export const completeAgent = (
  agentId: string,
  result: AgentExecutionResult,
): void => {
  const state = multiAgentStore.getState();
  const instance = state.instances.get(agentId);
  if (!instance) return;

  multiAgentStore.updateInstanceStatus(
    agentId,
    result.success ? "completed" : "error",
    result.error,
  );

  multiAgentStore.addEvent({
    type: result.success ? "agent_completed" : "agent_error",
    agentId,
    ...(result.success
      ? { result, timestamp: Date.now() }
      : { error: result.error ?? "Unknown error", timestamp: Date.now() }),
  } as
    | {
        type: "agent_completed";
        agentId: string;
        result: AgentExecutionResult;
        timestamp: number;
      }
    | {
        type: "agent_error";
        agentId: string;
        error: string;
        timestamp: number;
      });
};

/**
 * Cancel an agent
 */
export const cancelAgent = (agentId: string, reason?: string): void => {
  multiAgentStore.updateInstanceStatus(
    agentId,
    "cancelled",
    reason ?? "Cancelled by user",
  );
};

/**
 * Get agent by ID
 */
export const getAgent = (agentId: string): AgentInstance | undefined => {
  return multiAgentStore.getState().instances.get(agentId);
};

/**
 * Validate spawn config
 */
export const validateSpawnConfig = (
  config: AgentSpawnConfig,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.agentName) {
    errors.push("Agent name is required");
  }

  if (!config.task) {
    errors.push("Task is required");
  }

  const definition = getAgentDefinition(config.agentName);
  if (!definition) {
    errors.push(MULTI_AGENT_ERRORS.AGENT_NOT_FOUND(config.agentName));
  }

  if (config.timeout && config.timeout < 1000) {
    errors.push("Timeout must be at least 1000ms");
  }

  if (config.timeout && config.timeout > MULTI_AGENT_DEFAULTS.timeout * 2) {
    errors.push(`Timeout cannot exceed ${MULTI_AGENT_DEFAULTS.timeout * 2}ms`);
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Get all running agents
 */
export const getRunningAgents = (): AgentInstance[] => {
  return multiAgentStore.getInstancesByStatus("running");
};

/**
 * Get all agents waiting on conflicts
 */
export const getWaitingAgents = (): AgentInstance[] => {
  return multiAgentStore.getInstancesByStatus("waiting_conflict");
};

/**
 * Cancel all running agents
 */
export const cancelAllAgents = (reason?: string): void => {
  const running = getRunningAgents();
  const waiting = getWaitingAgents();

  [...running, ...waiting].forEach((agent) => {
    cancelAgent(agent.id, reason ?? MULTI_AGENT_ERRORS.EXECUTION_ABORTED);
  });
};

/**
 * Get agent statistics
 */
export const getAgentStats = (): {
  running: number;
  waiting: number;
  completed: number;
  failed: number;
  cancelled: number;
} => {
  const state = multiAgentStore.getState();
  const instances = Array.from(state.instances.values());

  return {
    running: instances.filter((i) => i.status === "running").length,
    waiting: instances.filter((i) => i.status === "waiting_conflict").length,
    completed: instances.filter((i) => i.status === "completed").length,
    failed: instances.filter((i) => i.status === "error").length,
    cancelled: instances.filter((i) => i.status === "cancelled").length,
  };
};
