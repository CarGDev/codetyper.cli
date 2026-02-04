/**
 * Multi-Agent Store
 *
 * Zustand store for managing multi-agent execution state.
 */

import { createStore } from "zustand/vanilla";
import type {
  AgentInstance,
  AgentInstanceStatus,
  AgentToolCall,
  FileConflict,
  MultiAgentRequest,
  MultiAgentEvent,
  ConflictResolutionResult,
} from "@/types/multi-agent";
import type { ChatMessage } from "@/types/common";
import {
  AGENT_ID_PREFIX,
  REQUEST_ID_PREFIX,
} from "@/constants/multi-agent";

/**
 * Multi-agent store state
 */
interface MultiAgentState {
  activeRequests: Map<string, MultiAgentRequest>;
  instances: Map<string, AgentInstance>;
  conflicts: FileConflict[];
  isExecuting: boolean;
  lastError: string | null;
  events: MultiAgentEvent[];
}

/**
 * Initial state
 */
const initialState: MultiAgentState = {
  activeRequests: new Map(),
  instances: new Map(),
  conflicts: [],
  isExecuting: false,
  lastError: null,
  events: [],
};

/**
 * Vanilla Zustand store
 */
const store = createStore<MultiAgentState>(() => ({
  ...initialState,
}));

/**
 * Generate unique agent ID
 */
const generateAgentId = (): string => {
  return `${AGENT_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique request ID
 */
const generateRequestId = (): string => {
  return `${REQUEST_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Add a new request
 */
const addRequest = (request: Omit<MultiAgentRequest, "id">): string => {
  const id = generateRequestId();
  const fullRequest: MultiAgentRequest = { ...request, id };

  store.setState((state) => {
    const newRequests = new Map(state.activeRequests);
    newRequests.set(id, fullRequest);
    return {
      activeRequests: newRequests,
      isExecuting: true,
    };
  });

  return id;
};

/**
 * Remove a request
 */
const removeRequest = (requestId: string): void => {
  store.setState((state) => {
    const newRequests = new Map(state.activeRequests);
    newRequests.delete(requestId);
    return {
      activeRequests: newRequests,
      isExecuting: newRequests.size > 0,
    };
  });
};

/**
 * Add a new agent instance
 */
const addInstance = (instance: Omit<AgentInstance, "id">): string => {
  const id = generateAgentId();
  const fullInstance: AgentInstance = { ...instance, id };

  store.setState((state) => {
    const newInstances = new Map(state.instances);
    newInstances.set(id, fullInstance);
    return { instances: newInstances };
  });

  addEvent({ type: "agent_started", agentId: id, timestamp: Date.now() });
  return id;
};

/**
 * Update agent instance status
 */
const updateInstanceStatus = (
  agentId: string,
  status: AgentInstanceStatus,
  error?: string,
): void => {
  store.setState((state) => {
    const instance = state.instances.get(agentId);
    if (!instance) return state;

    const newInstances = new Map(state.instances);
    newInstances.set(agentId, {
      ...instance,
      status,
      error,
      completedAt: ["completed", "error", "cancelled"].includes(status)
        ? Date.now()
        : undefined,
    });

    return { instances: newInstances };
  });
};

/**
 * Add a message to agent conversation
 */
const addAgentMessage = (agentId: string, message: ChatMessage): void => {
  store.setState((state) => {
    const instance = state.instances.get(agentId);
    if (!instance) return state;

    const newInstances = new Map(state.instances);
    newInstances.set(agentId, {
      ...instance,
      conversation: {
        ...instance.conversation,
        messages: [...instance.conversation.messages, message],
      },
    });

    return { instances: newInstances };
  });
};

/**
 * Add a tool call to agent conversation
 */
const addToolCall = (agentId: string, toolCall: AgentToolCall): void => {
  store.setState((state) => {
    const instance = state.instances.get(agentId);
    if (!instance) return state;

    const newInstances = new Map(state.instances);
    newInstances.set(agentId, {
      ...instance,
      conversation: {
        ...instance.conversation,
        toolCalls: [...instance.conversation.toolCalls, toolCall],
      },
    });

    return { instances: newInstances };
  });
};

/**
 * Update tool call result
 */
const updateToolCallResult = (
  agentId: string,
  toolCallId: string,
  result: AgentToolCall["result"],
): void => {
  store.setState((state) => {
    const instance = state.instances.get(agentId);
    if (!instance) return state;

    const newInstances = new Map(state.instances);
    newInstances.set(agentId, {
      ...instance,
      conversation: {
        ...instance.conversation,
        toolCalls: instance.conversation.toolCalls.map((tc) =>
          tc.id === toolCallId ? { ...tc, result } : tc,
        ),
      },
    });

    return { instances: newInstances };
  });
};

/**
 * Add a file to agent's modified files list
 */
const addModifiedFile = (agentId: string, filePath: string): void => {
  store.setState((state) => {
    const instance = state.instances.get(agentId);
    if (!instance) return state;

    if (instance.modifiedFiles.includes(filePath)) return state;

    const newInstances = new Map(state.instances);
    newInstances.set(agentId, {
      ...instance,
      modifiedFiles: [...instance.modifiedFiles, filePath],
    });

    return { instances: newInstances };
  });
};

/**
 * Add a conflict
 */
const addConflict = (conflict: FileConflict): void => {
  store.setState((state) => ({
    conflicts: [...state.conflicts, conflict],
  }));

  addEvent({ type: "conflict_detected", conflict, timestamp: Date.now() });
};

/**
 * Resolve a conflict
 */
const resolveConflict = (
  filePath: string,
  resolution: ConflictResolutionResult,
): void => {
  store.setState((state) => {
    const updatedConflicts = state.conflicts.map((c) =>
      c.filePath === filePath ? { ...c, resolution } : c,
    );
    return { conflicts: updatedConflicts };
  });

  const conflict = store.getState().conflicts.find((c) => c.filePath === filePath);
  if (conflict) {
    addEvent({
      type: "conflict_resolved",
      conflict: { ...conflict, resolution },
      timestamp: Date.now(),
    });
  }
};

/**
 * Add an event
 */
const addEvent = (event: MultiAgentEvent): void => {
  store.setState((state) => ({
    events: [...state.events.slice(-99), event], // Keep last 100 events
  }));
};

/**
 * Set last error
 */
const setError = (error: string | null): void => {
  store.setState({ lastError: error });
};

/**
 * Clear all state
 */
const clear = (): void => {
  store.setState({ ...initialState });
};

/**
 * Get active agent instances
 */
const getActiveInstances = (): AgentInstance[] => {
  const { instances } = store.getState();
  return Array.from(instances.values()).filter(
    (i) => i.status === "running" || i.status === "waiting_conflict",
  );
};

/**
 * Get instances by status
 */
const getInstancesByStatus = (status: AgentInstanceStatus): AgentInstance[] => {
  const { instances } = store.getState();
  return Array.from(instances.values()).filter((i) => i.status === status);
};

/**
 * Get unresolved conflicts
 */
const getUnresolvedConflicts = (): FileConflict[] => {
  const { conflicts } = store.getState();
  return conflicts.filter((c) => !c.resolution);
};

/**
 * Check if a file is being modified by any agent
 */
const isFileBeingModified = (filePath: string): boolean => {
  const activeInstances = getActiveInstances();
  return activeInstances.some((i) => i.modifiedFiles.includes(filePath));
};

/**
 * Get agent modifying a file
 */
const getAgentModifyingFile = (filePath: string): AgentInstance | null => {
  const activeInstances = getActiveInstances();
  return activeInstances.find((i) => i.modifiedFiles.includes(filePath)) ?? null;
};

/**
 * Multi-agent store API
 */
export const multiAgentStore = {
  // Request management
  addRequest,
  removeRequest,

  // Instance management
  addInstance,
  updateInstanceStatus,
  addAgentMessage,
  addToolCall,
  updateToolCallResult,
  addModifiedFile,

  // Conflict management
  addConflict,
  resolveConflict,

  // Events
  addEvent,

  // Error handling
  setError,

  // State management
  clear,

  // Queries
  getActiveInstances,
  getInstancesByStatus,
  getUnresolvedConflicts,
  isFileBeingModified,
  getAgentModifyingFile,

  // State access
  getState: store.getState,
  subscribe: store.subscribe,
};

// Export store for React hooks
export { store as multiAgentStoreVanilla };
export type { MultiAgentState };
