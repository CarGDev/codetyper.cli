/**
 * Multi-Agent Executor
 *
 * Orchestrates concurrent execution of multiple agents with
 * conflict detection, resource management, and result aggregation.
 */

import type {
  MultiAgentRequest,
  MultiAgentResult,
  AgentSpawnConfig,
  AgentInstance,
  AgentExecutionResult,
  MultiAgentExecutorOptions,
  FileConflict,
} from "@/types/multi-agent";
import { multiAgentStore } from "@stores/core/multi-agent-store";
import {
  MULTI_AGENT_DEFAULTS,
  MULTI_AGENT_ERRORS,
  MULTI_AGENT_LIMITS,
} from "@/constants/multi-agent";
import {
  createAgentInstance,
  startAgent,
  completeAgent,
  cancelAgent,
  validateSpawnConfig,
} from "@/services/multi-agent/agent-manager";
import {
  createToolContext,
  cleanupToolContext,
} from "@/services/multi-agent/tool-context";
import {
  resolveConflict,
  clearAllLocks,
} from "@/services/multi-agent/conflict-handler";

/**
 * Execute multiple agents according to request configuration
 */
export const executeMultiAgent = async (
  request: Omit<MultiAgentRequest, "id">,
  options: MultiAgentExecutorOptions = {},
): Promise<MultiAgentResult> => {
  const startTime = Date.now();

  // Validate request
  const validationError = validateRequest(request);
  if (validationError) {
    throw new Error(validationError);
  }

  // Add request to store
  const requestId = multiAgentStore.addRequest(request);

  // Track results
  const results: AgentInstance[] = [];
  const conflicts: FileConflict[] = [];

  try {
    // Execute based on mode
    const executionHandlers: Record<
      typeof request.executionMode,
      () => Promise<void>
    > = {
      sequential: () => executeSequential(request.agents, options, results),
      parallel: () => executeParallel(request, options, results, conflicts),
      adaptive: () => executeAdaptive(request, options, results, conflicts),
    };

    await executionHandlers[request.executionMode]();

    // Aggregate results
    const result = aggregateResults(requestId, results, conflicts, startTime);

    // Emit completion event
    options.onEvent?.({
      type: "execution_completed",
      result,
      timestamp: Date.now(),
    });

    return result;
  } finally {
    // Cleanup
    multiAgentStore.removeRequest(requestId);
    clearAllLocks();
  }
};

/**
 * Validate request configuration
 */
const validateRequest = (
  request: Omit<MultiAgentRequest, "id">,
): string | null => {
  if (request.agents.length === 0) {
    return "At least one agent is required";
  }

  if (request.agents.length > MULTI_AGENT_LIMITS.maxAgentsPerRequest) {
    return MULTI_AGENT_ERRORS.MAX_AGENTS_EXCEEDED(
      MULTI_AGENT_LIMITS.maxAgentsPerRequest,
    );
  }

  // Validate each agent config
  for (const config of request.agents) {
    const validation = validateSpawnConfig(config);
    if (!validation.valid) {
      return validation.errors[0];
    }
  }

  return null;
};

/**
 * Execute agents sequentially
 */
const executeSequential = async (
  configs: AgentSpawnConfig[],
  options: MultiAgentExecutorOptions,
  results: AgentInstance[],
): Promise<void> => {
  for (const config of configs) {
    if (options.abortSignal?.aborted) {
      break;
    }

    const instance = await executeSingleAgent(config, options);
    results.push(instance);

    // Check for abort on error
    if (instance.status === "error" && options.abortSignal) {
      break;
    }
  }
};

/**
 * Execute agents in parallel
 */
const executeParallel = async (
  request: Omit<MultiAgentRequest, "id">,
  options: MultiAgentExecutorOptions,
  results: AgentInstance[],
  conflicts: FileConflict[],
): Promise<void> => {
  const maxConcurrent =
    request.maxConcurrent ?? MULTI_AGENT_DEFAULTS.maxConcurrent;
  const chunks = chunkArray(request.agents, maxConcurrent);

  for (const chunk of chunks) {
    if (options.abortSignal?.aborted) {
      break;
    }

    // Execute chunk in parallel
    const chunkPromises = chunk.map((config) =>
      executeSingleAgent(config, options),
    );

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Collect any conflicts
    const newConflicts = multiAgentStore.getUnresolvedConflicts();
    conflicts.push(...newConflicts.filter((c) => !conflicts.includes(c)));

    // Resolve conflicts if any
    for (const conflict of newConflicts) {
      await resolveConflict(conflict, request.conflictStrategy);
    }
  }
};

/**
 * Execute agents adaptively (start parallel, serialize on conflict)
 */
const executeAdaptive = async (
  request: Omit<MultiAgentRequest, "id">,
  options: MultiAgentExecutorOptions,
  results: AgentInstance[],
  conflicts: FileConflict[],
): Promise<void> => {
  const maxConcurrent =
    request.maxConcurrent ?? MULTI_AGENT_DEFAULTS.maxConcurrent;
  let conflictCount = 0;
  let useSequential = false;

  // Start with parallel execution
  const remaining = [...request.agents];
  const running: Promise<AgentInstance>[] = [];

  while (remaining.length > 0 || running.length > 0) {
    if (options.abortSignal?.aborted) {
      // Cancel all running agents
      multiAgentStore.getActiveInstances().forEach((instance) => {
        cancelAgent(instance.id, MULTI_AGENT_ERRORS.EXECUTION_ABORTED);
      });
      break;
    }

    // Start new agents if under limit and not in sequential mode
    while (
      remaining.length > 0 &&
      running.length < maxConcurrent &&
      !useSequential
    ) {
      const config = remaining.shift()!;
      running.push(executeSingleAgent(config, options));
    }

    // If in sequential mode, wait for current to finish before starting next
    if (useSequential && remaining.length > 0 && running.length === 0) {
      const config = remaining.shift()!;
      running.push(executeSingleAgent(config, options));
    }

    // Wait for at least one to complete
    if (running.length > 0) {
      const completed = await Promise.race(
        running.map((p, i) => p.then((result) => ({ result, index: i }))),
      );

      results.push(completed.result);
      running.splice(completed.index, 1);

      // Check for new conflicts
      const newConflicts = multiAgentStore.getUnresolvedConflicts();
      for (const conflict of newConflicts) {
        if (!conflicts.includes(conflict)) {
          conflicts.push(conflict);
          conflictCount++;

          // Resolve conflict
          await resolveConflict(conflict, request.conflictStrategy);

          // Switch to sequential mode if too many conflicts
          if (conflictCount >= MULTI_AGENT_LIMITS.maxConflictsBeforeAbort) {
            useSequential = true;
          }
        }
      }
    }
  }
};

/**
 * Execute a single agent
 */
const executeSingleAgent = async (
  config: AgentSpawnConfig,
  options: MultiAgentExecutorOptions,
): Promise<AgentInstance> => {
  // Create instance
  const instanceOrError = createAgentInstance(config);
  if ("error" in instanceOrError) {
    throw new Error(instanceOrError.error);
  }

  const instance = instanceOrError;

  // Create tool context
  createToolContext(instance.id, process.cwd(), config.contextFiles, []);

  // Start agent
  startAgent(instance.id);

  try {
    // Execute agent task
    const result = await executeAgentTask(instance, config, options);

    // Complete agent
    completeAgent(instance.id, result);

    return multiAgentStore.getState().instances.get(instance.id) ?? instance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    completeAgent(instance.id, {
      success: false,
      error: errorMessage,
      filesModified: [],
      toolCallCount: 0,
      duration: Date.now() - instance.startedAt,
    });

    return multiAgentStore.getState().instances.get(instance.id) ?? instance;
  } finally {
    // Cleanup context
    cleanupToolContext(instance.id);
  }
};

/**
 * Execute the actual agent task
 * Integrates with the core agent system for LLM interaction
 */
const executeAgentTask = async (
  instance: AgentInstance,
  config: AgentSpawnConfig,
  options: MultiAgentExecutorOptions,
): Promise<AgentExecutionResult> => {
  const startTime = Date.now();

  // Dynamic imports to avoid circular dependencies
  const { runAgent } = await import("@services/core/agent");
  const { buildSystemPromptWithInfo } = await import("@prompts/system/builder");

  // Get model based on tier
  const modelId = getModelForTier(instance.definition.tier);

  // Build system prompt based on agent definition
  const context = {
    workingDir: process.cwd(),
    isGitRepo: true,
    platform: process.platform,
    today: new Date().toISOString().split("T")[0],
    modelId,
    customInstructions: instance.definition.systemPrompt,
  };

  // Get prompt with tier/provider info and model params
  const { prompt: systemPrompt, params } = buildSystemPromptWithInfo(context);

  // Log tier detection for debugging (only in verbose mode)
  if (options.onEvent) {
    options.onEvent({
      type: "agent_started",
      agentId: instance.id,
      timestamp: Date.now(),
    });
  }

  // Build enhanced task prompt with agent context
  const enhancedTask = buildAgentTaskPrompt(instance, config);

  const filesModified: string[] = [];
  let toolCallCount = 0;

  try {
    const result = await runAgent(enhancedTask, systemPrompt, {
      provider: "copilot",
      model: modelId,
      autoApprove: true,
      maxIterations: instance.definition.maxTurns ?? 10,
      verbose: false,
      modelParams: {
        temperature: params.temperature,
        topP: params.topP,
        maxTokens: params.maxTokens,
      },
      onToolCall: (toolCall) => {
        toolCallCount++;
        const agentToolCall = {
          id: toolCall.id,
          toolName: toolCall.name,
          args: toolCall.arguments,
          timestamp: Date.now(),
        };
        multiAgentStore.addToolCall(instance.id, agentToolCall);
        options.onToolCall?.(instance.id, agentToolCall);
      },
      onToolResult: (_toolCallId, toolResult) => {
        // Track file modifications
        if (toolResult.success && toolResult.output?.includes("File written:")) {
          const match = toolResult.output.match(/File written: (.+)/);
          if (match) {
            filesModified.push(match[1]);
            multiAgentStore.addModifiedFile(instance.id, match[1]);
          }
        }
      },
      onText: (text) => {
        const message = {
          role: "assistant" as const,
          content: text,
          timestamp: Date.now(),
        };
        multiAgentStore.addAgentMessage(instance.id, message);
        options.onAgentMessage?.(instance.id, message);
      },
    });

    return {
      success: result.success,
      output: result.finalResponse,
      filesModified,
      toolCallCount,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      filesModified,
      toolCallCount,
      duration: Date.now() - startTime,
    };
  }
};

/**
 * Build enhanced task prompt with agent context
 */
const buildAgentTaskPrompt = (
  instance: AgentInstance,
  config: AgentSpawnConfig,
): string => {
  const parts: string[] = [];

  // Agent identity
  parts.push(`## Agent: ${instance.definition.name}`);
  parts.push(`Description: ${instance.definition.description}`);

  // Available tools
  if (instance.definition.tools.length > 0) {
    parts.push(`\nAvailable tools: ${instance.definition.tools.join(", ")}`);
  }

  // Task
  parts.push(`\n## Task\n${config.task}`);

  // Context files
  if (config.contextFiles?.length) {
    parts.push(`\n## Context Files\n${config.contextFiles.map(f => `- ${f}`).join("\n")}`);
  }

  // System prompt override as additional instructions
  if (config.systemPromptOverride) {
    parts.push(`\n## Additional Instructions\n${config.systemPromptOverride}`);
  }

  return parts.join("\n");
};

/**
 * Get model ID for agent tier
 */
const getModelForTier = (tier: string): string => {
  const tierModels: Record<string, string> = {
    fast: "gpt-4o-mini",
    balanced: "gpt-4o",
    thorough: "o1",
  };
  return tierModels[tier] ?? "gpt-4o";
};

/**
 * Aggregate results from all agents
 */
const aggregateResults = (
  requestId: string,
  agents: AgentInstance[],
  conflicts: FileConflict[],
  startTime: number,
): MultiAgentResult => {
  const successful = agents.filter((a) => a.status === "completed").length;
  const failed = agents.filter((a) => a.status === "error").length;
  const cancelled = agents.filter((a) => a.status === "cancelled").length;

  // Aggregate output from all successful agents
  const outputs = agents
    .filter((a) => a.status === "completed" && a.result?.output)
    .map((a) => a.result!.output);

  return {
    requestId,
    agents,
    successful,
    failed,
    cancelled,
    conflicts,
    totalDuration: Date.now() - startTime,
    aggregatedOutput:
      outputs.length > 0 ? outputs.join("\n\n---\n\n") : undefined,
  };
};

/**
 * Split array into chunks
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Cancel a running multi-agent execution
 */
export const cancelExecution = (requestId: string): void => {
  const request = multiAgentStore.getState().activeRequests.get(requestId);
  if (!request) return;

  // Cancel all agents associated with this request
  multiAgentStore.getActiveInstances().forEach((instance) => {
    cancelAgent(instance.id, MULTI_AGENT_ERRORS.EXECUTION_ABORTED);
  });

  multiAgentStore.removeRequest(requestId);
};

/**
 * Get execution status
 */
export const getExecutionStatus = (): {
  isExecuting: boolean;
  activeRequests: number;
  runningAgents: number;
  conflicts: number;
} => {
  const state = multiAgentStore.getState();

  return {
    isExecuting: state.isExecuting,
    activeRequests: state.activeRequests.size,
    runningAgents: multiAgentStore.getActiveInstances().length,
    conflicts: multiAgentStore.getUnresolvedConflicts().length,
  };
};
