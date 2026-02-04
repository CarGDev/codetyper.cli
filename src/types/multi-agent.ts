/**
 * Multi-Agent Execution Types
 *
 * Types for spawning and managing multiple agents in parallel
 * with conflict detection and resolution.
 */

import type { AgentDefinition } from "@/types/agent-definition";
import type { ChatMessage } from "@/types/common";

/**
 * Agent execution modes
 */
export type AgentExecutionMode =
  | "sequential"  // Execute agents one after another
  | "parallel"    // Execute all agents concurrently
  | "adaptive";   // Start parallel, serialize on conflict

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy =
  | "serialize"      // Wait for conflicting agent to complete
  | "abort-newer"    // Abort the newer agent
  | "merge-results"  // Attempt to merge both results
  | "isolated";      // Each agent works in isolated context

/**
 * Agent instance status
 */
export type AgentInstanceStatus =
  | "pending"           // Waiting to start
  | "running"           // Actively executing
  | "waiting_conflict"  // Paused due to conflict
  | "completed"         // Successfully finished
  | "error"             // Failed with error
  | "cancelled";        // Cancelled by user or system

/**
 * Tool call record for agent conversation
 */
export interface AgentToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: {
    success: boolean;
    output?: string;
    error?: string;
  };
  timestamp: number;
}

/**
 * Agent conversation state
 */
export interface AgentConversation {
  messages: ChatMessage[];
  toolCalls: AgentToolCall[];
}

/**
 * Configuration for spawning an agent
 */
export interface AgentSpawnConfig {
  agentName: string;
  task: string;
  contextFiles?: string[];
  priority?: number;
  timeout?: number;
  allowedTools?: string[];
  systemPromptOverride?: string;
}

/**
 * Running agent instance
 */
export interface AgentInstance {
  id: string;
  definition: AgentDefinition;
  config: AgentSpawnConfig;
  status: AgentInstanceStatus;
  conversation: AgentConversation;
  startedAt: number;
  completedAt?: number;
  error?: string;
  modifiedFiles: string[];
  result?: AgentExecutionResult;
}

/**
 * Result from a single agent execution
 */
export interface AgentExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  filesModified: string[];
  toolCallCount: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
}

/**
 * File conflict between agents
 */
export interface FileConflict {
  filePath: string;
  conflictingAgentIds: string[];
  detectedAt: number;
  resolution?: ConflictResolutionResult;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolutionResult {
  strategy: ConflictStrategy;
  winningAgentId?: string;
  mergedContent?: string;
  resolvedAt: number;
}

/**
 * Request to execute multiple agents
 */
export interface MultiAgentRequest {
  id: string;
  agents: AgentSpawnConfig[];
  executionMode: AgentExecutionMode;
  conflictStrategy: ConflictStrategy;
  maxConcurrent?: number;
  timeout?: number;
  abortOnFirstError?: boolean;
}

/**
 * Result of multi-agent execution
 */
export interface MultiAgentResult {
  requestId: string;
  agents: AgentInstance[];
  successful: number;
  failed: number;
  cancelled: number;
  conflicts: FileConflict[];
  totalDuration: number;
  aggregatedOutput?: string;
}

/**
 * Multi-agent state for store
 */
export interface MultiAgentState {
  activeRequests: Map<string, MultiAgentRequest>;
  instances: Map<string, AgentInstance>;
  conflicts: FileConflict[];
  isExecuting: boolean;
  lastError?: string;
}

/**
 * Events emitted during multi-agent execution
 */
export type MultiAgentEvent =
  | { type: "agent_started"; agentId: string; timestamp: number }
  | { type: "agent_completed"; agentId: string; result: AgentExecutionResult; timestamp: number }
  | { type: "agent_error"; agentId: string; error: string; timestamp: number }
  | { type: "conflict_detected"; conflict: FileConflict; timestamp: number }
  | { type: "conflict_resolved"; conflict: FileConflict; timestamp: number }
  | { type: "execution_completed"; result: MultiAgentResult; timestamp: number };

/**
 * Multi-agent executor options
 */
export interface MultiAgentExecutorOptions {
  onEvent?: (event: MultiAgentEvent) => void;
  onAgentMessage?: (agentId: string, message: ChatMessage) => void;
  onToolCall?: (agentId: string, toolCall: AgentToolCall) => void;
  abortSignal?: AbortSignal;
}

/**
 * Agent tool context for isolated execution
 */
export interface AgentToolContext {
  agentId: string;
  workingDir: string;
  allowedPaths: string[];
  deniedPaths: string[];
  modifiedFiles: Set<string>;
  lockedFiles: Set<string>;
}
