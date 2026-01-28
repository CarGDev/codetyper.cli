/**
 * Reasoning-Enhanced Agent
 *
 * Extends the base agent with cognitive control layers that provide
 * intelligent control flow independent of the underlying model.
 *
 * This agent wraps the standard agent loop with:
 * - Quality evaluation of responses
 * - Automatic retry with reframing
 * - Context compression
 * - Memory relevance selection
 * - Termination confidence detection
 */

import { v4 as uuidv4 } from "uuid";
import type { Message } from "@/types/providers";
import type { AgentOptions } from "@interfaces/AgentOptions";
import type { AgentResult } from "@interfaces/AgentResult";
import type {
  AgentMessage,
  ToolCallMessage,
  ToolResultMessage,
} from "@/types/agent";
import { chat as providerChat } from "@providers/index";
import { getTool, getToolsForApi, refreshMCPTools } from "@tools/index";
import type { ToolContext, ToolCall, ToolResult } from "@/types/tools";
import { initializePermissions } from "@services/permissions";
import { MAX_ITERATIONS } from "@constants/agent";
import { usageStore } from "@stores/usage-store";
import type {
  TaskConstraints,
  CompressibleMessage,
  AttemptRecord,
  ReasoningControlState,
  QualityEvalOutput,
} from "@/types/reasoning";

import {
  createInitialState,
  createMemoryStore,
  addMemory,
  createMemoryItem,
  evaluateResponseQuality,
  decideRetry,
  compressContext,
  markMessagesWithAge,
  getPreservationCandidates,
  checkTermination,
  estimateTokens,
  createTimestamp,
} from "@services/reasoning";

// =============================================================================
// TYPES
// =============================================================================

export interface ReasoningAgentOptions extends AgentOptions {
  enableReasoning?: boolean;
  reasoningConfig?: {
    tokenBudget?: number;
    autoValidate?: boolean;
    maxRetries?: number;
  };
  onQualityEval?: (output: QualityEvalOutput) => void;
  onRetry?: (attempt: number, reason: string) => void;
  onCompression?: (tokensSaved: number) => void;
}

interface ReasoningAgentState {
  sessionId: string;
  workingDir: string;
  abort: AbortController;
  options: ReasoningAgentOptions;
  reasoningState: ReasoningControlState;
  memoryStore: ReturnType<typeof createMemoryStore>;
  taskConstraints: TaskConstraints;
}

// =============================================================================
// STATE INITIALIZATION
// =============================================================================

const createReasoningAgentState = (
  workingDir: string,
  options: ReasoningAgentOptions,
  taskConstraints?: Partial<TaskConstraints>,
): ReasoningAgentState => ({
  sessionId: uuidv4(),
  workingDir,
  abort: new AbortController(),
  options,
  reasoningState: createInitialState(),
  memoryStore: createMemoryStore(500),
  taskConstraints: {
    requiredOutputs: [],
    expectedToolCalls: [],
    maxResponseTokens: 4000,
    requiresCode: false,
    ...taskConstraints,
  },
});

// =============================================================================
// LLM INTERACTION
// =============================================================================

const callLLMWithReasoning = async (
  state: ReasoningAgentState,
  messages: AgentMessage[],
): Promise<{
  content: string | null;
  toolCalls?: ToolCall[];
  tokenCount: number;
}> => {
  const toolDefs = getToolsForApi();

  const providerMessages: unknown[] = messages.map((msg) => {
    if ("tool_calls" in msg) {
      return {
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls,
      };
    }
    if ("tool_call_id" in msg) {
      return {
        role: "tool",
        tool_call_id: msg.tool_call_id,
        content: msg.content,
      };
    }
    return msg;
  });

  const response = await providerChat(
    state.options.provider,
    providerMessages as Message[],
    {
      model: state.options.model,
      tools: toolDefs,
    },
  );

  if (response.usage) {
    usageStore.addUsage({
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      model: state.options.model,
    });
  }

  const toolCalls: ToolCall[] = [];

  if (response.toolCalls) {
    for (const tc of response.toolCalls) {
      let args: Record<string, unknown>;
      try {
        args =
          typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
      } catch {
        args = {};
      }

      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: args,
      });
    }
  }

  const tokenCount =
    response.usage?.completionTokens || estimateTokens(response.content || "");

  return {
    content: response.content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    tokenCount,
  };
};

// =============================================================================
// TOOL EXECUTION
// =============================================================================

const executeToolWithTracking = async (
  state: ReasoningAgentState,
  toolCall: ToolCall,
): Promise<ToolResult & { executionTime: number }> => {
  const startTime = createTimestamp();
  const tool = getTool(toolCall.name);

  if (!tool) {
    return {
      success: false,
      title: "Unknown tool",
      output: "",
      error: `Tool not found: ${toolCall.name}`,
      executionTime: createTimestamp() - startTime,
    };
  }

  const ctx: ToolContext = {
    sessionId: state.sessionId,
    messageId: uuidv4(),
    workingDir: state.workingDir,
    abort: state.abort,
    autoApprove: state.options.autoApprove,
  };

  try {
    const validatedArgs = tool.parameters.parse(toolCall.arguments);
    const result = await tool.execute(validatedArgs, ctx);
    return {
      ...result,
      executionTime: createTimestamp() - startTime,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      title: "Tool error",
      output: "",
      error: errorMessage,
      executionTime: createTimestamp() - startTime,
    };
  }
};

// =============================================================================
// CONTEXT MANAGEMENT
// =============================================================================

const convertToCompressibleMessages = (
  messages: AgentMessage[],
  currentTurn: number,
): CompressibleMessage[] => {
  return messages.map((msg, idx) => {
    let content: string;
    let role: "user" | "assistant" | "tool" | "system";

    if ("tool_calls" in msg) {
      role = "assistant";
      content = msg.content || JSON.stringify(msg.tool_calls);
    } else if ("tool_call_id" in msg) {
      role = "tool";
      content = msg.content;
    } else {
      role = msg.role as "user" | "assistant" | "system";
      content = msg.content;
    }

    return {
      id: `msg_${idx}`,
      role,
      content,
      tokenCount: estimateTokens(content),
      age: currentTurn - idx,
      isPreserved: idx >= messages.length - 3,
    };
  });
};

const applyContextCompression = (
  state: ReasoningAgentState,
  messages: AgentMessage[],
  tokenBudget: number,
): { messages: AgentMessage[]; tokensSaved: number } => {
  const compressible = convertToCompressibleMessages(messages, messages.length);
  const aged = markMessagesWithAge(compressible, messages.length);
  const preserveList = getPreservationCandidates(aged);

  const currentTokenCount = aged.reduce((sum, m) => sum + m.tokenCount, 0);

  if (currentTokenCount <= tokenBudget * 0.8) {
    return { messages, tokensSaved: 0 };
  }

  const compressionOutput = compressContext({
    messages: aged,
    toolResults: [],
    entities: state.reasoningState.entityTable,
    currentTokenCount,
    tokenLimit: tokenBudget,
    preserveList,
  });

  state.options.onCompression?.(compressionOutput.tokensSaved);

  const compressedAgentMessages = compressionOutput.compressedMessages.map(
    (cm): AgentMessage => ({
      role: cm.role as "user" | "assistant" | "system",
      content: cm.content,
    }),
  );

  return {
    messages: compressedAgentMessages,
    tokensSaved: compressionOutput.tokensSaved,
  };
};

// =============================================================================
// QUALITY-CONTROLLED AGENT LOOP
// =============================================================================

export const runReasoningAgentLoop = async (
  state: ReasoningAgentState,
  messages: Message[],
): Promise<AgentResult> => {
  const maxIterations = state.options.maxIterations ?? MAX_ITERATIONS;
  const tokenBudget = state.options.reasoningConfig?.tokenBudget ?? 8000;
  const allToolCalls: { call: ToolCall; result: ToolResult }[] = [];
  let iterations = 0;
  let finalResponse = "";

  await initializePermissions();
  await refreshMCPTools();

  let agentMessages: AgentMessage[] = [...messages];
  const originalQuery = messages.find((m) => m.role === "user")?.content || "";
  const previousAttempts: AttemptRecord[] = [];

  while (iterations < maxIterations) {
    iterations++;

    state.reasoningState = {
      ...state.reasoningState,
      metrics: {
        ...state.reasoningState.metrics,
        totalLLMCalls: state.reasoningState.metrics.totalLLMCalls + 1,
      },
    };

    try {
      const { messages: compressedMessages, tokensSaved } =
        applyContextCompression(state, agentMessages, tokenBudget);

      if (tokensSaved > 0) {
        agentMessages = compressedMessages;
      }

      const response = await callLLMWithReasoning(state, agentMessages);

      if (state.options.enableReasoning !== false) {
        const qualityOutput = evaluateResponseQuality({
          responseText: response.content || "",
          responseToolCalls:
            response.toolCalls?.map((tc) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            })) || [],
          originalQuery,
          taskConstraints: state.taskConstraints,
          previousAttempts,
        });

        state.options.onQualityEval?.(qualityOutput);

        if (qualityOutput.verdict !== "ACCEPT") {
          const retryDecision = decideRetry({
            qualityOutput,
            state: state.reasoningState,
            availableTools: ["read", "write", "edit", "bash", "glob", "grep"],
            contextBudget: tokenBudget,
          });

          state.reasoningState = retryDecision.updatedState;

          previousAttempts.push({
            attemptNumber: iterations,
            timestamp: createTimestamp(),
            verdict: qualityOutput.verdict,
            deficiencies: qualityOutput.deficiencies,
            score: qualityOutput.score,
          });

          if (retryDecision.shouldRetry) {
            state.options.onRetry?.(
              iterations,
              `Quality: ${qualityOutput.verdict}, Score: ${qualityOutput.score.toFixed(2)}`,
            );
            continue;
          }

          if (retryDecision.action.kind === "ABORT") {
            state.options.onError?.(
              `Agent aborted: ${retryDecision.action.reason}`,
            );
            return {
              success: false,
              finalResponse: `Aborted: ${retryDecision.action.reason}`,
              iterations,
              toolCalls: allToolCalls,
            };
          }

          if (retryDecision.action.kind === "ESCALATE_TO_USER") {
            state.options.onWarning?.("Escalating to user for guidance");
          }
        }
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        const assistantMessage: ToolCallMessage = {
          role: "assistant",
          content: response.content || null,
          tool_calls: response.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
        agentMessages.push(assistantMessage);

        if (response.content) {
          state.options.onText?.(response.content);
        }

        const toolResults: Array<{ name: string; success: boolean }> = [];

        for (const toolCall of response.toolCalls) {
          state.options.onToolCall?.(toolCall);

          const result = await executeToolWithTracking(state, toolCall);
          allToolCalls.push({ call: toolCall, result });
          toolResults.push({ name: toolCall.name, success: result.success });

          state.options.onToolResult?.(toolCall.id, result);

          state.memoryStore = addMemory(
            state.memoryStore,
            createMemoryItem(result.output, "TOOL_RESULT"),
          );

          const toolResultMessage: ToolResultMessage = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.error
              ? `Error: ${result.error}\n\n${result.output}`
              : result.output,
          };
          agentMessages.push(toolResultMessage);

          state.reasoningState = {
            ...state.reasoningState,
            metrics: {
              ...state.reasoningState.metrics,
              totalToolExecutions:
                state.reasoningState.metrics.totalToolExecutions + 1,
            },
          };
        }

        if (state.options.enableReasoning !== false) {
          const termCheck = checkTermination({
            responseText: response.content || "",
            hasToolCalls: true,
            toolResults,
            state: state.reasoningState,
          });

          state.reasoningState = {
            ...state.reasoningState,
            termination: termCheck.terminationState,
          };

          if (termCheck.isTerminal && termCheck.decision.kind === "COMPLETE") {
            finalResponse = response.content || "";
            break;
          }
        }
      } else {
        finalResponse = response.content || "";

        if (state.options.enableReasoning !== false) {
          const termCheck = checkTermination({
            responseText: finalResponse,
            hasToolCalls: false,
            toolResults: [],
            state: state.reasoningState,
          });

          if (
            termCheck.decision.kind === "COMPLETE" ||
            !termCheck.requiresValidation
          ) {
            state.options.onText?.(finalResponse);
            break;
          }
        } else {
          state.options.onText?.(finalResponse);
          break;
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      state.options.onError?.(`Agent error: ${errorMessage}`);
      return {
        success: false,
        finalResponse: `Error: ${errorMessage}`,
        iterations,
        toolCalls: allToolCalls,
      };
    }
  }

  if (iterations >= maxIterations) {
    state.options.onWarning?.(`Reached max iterations (${maxIterations})`);
  }

  return {
    success: true,
    finalResponse,
    iterations,
    toolCalls: allToolCalls,
  };
};

// =============================================================================
// PUBLIC API
// =============================================================================

export const runReasoningAgent = async (
  prompt: string,
  systemPrompt: string,
  options: ReasoningAgentOptions,
  taskConstraints?: Partial<TaskConstraints>,
): Promise<AgentResult> => {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const state = createReasoningAgentState(
    process.cwd(),
    options,
    taskConstraints,
  );
  return runReasoningAgentLoop(state, messages);
};

export const createReasoningAgent = (
  workingDir: string,
  options: ReasoningAgentOptions,
  taskConstraints?: Partial<TaskConstraints>,
): {
  run: (messages: Message[]) => Promise<AgentResult>;
  stop: () => void;
  getState: () => ReasoningControlState;
} => {
  const state = createReasoningAgentState(workingDir, options, taskConstraints);

  return {
    run: (messages: Message[]) => runReasoningAgentLoop(state, messages),
    stop: () => state.abort.abort(),
    getState: () => state.reasoningState,
  };
};

// Types are exported via interface declaration above
