/**
 * Streaming Agent Loop
 *
 * Agent loop that streams LLM responses in real-time to the TUI.
 * Handles tool call accumulation mid-stream.
 */

import { v4 as uuidv4 } from "uuid";
import type { Message, StreamChunk } from "@/types/providers";
import type { AgentOptions } from "@interfaces/AgentOptions";
import type { AgentResult } from "@interfaces/AgentResult";
import type {
  AgentMessage,
  ToolCallMessage,
  ToolResultMessage,
} from "@/types/agent";
import type { ToolCall, ToolResult, ToolContext } from "@/types/tools";
import type {
  StreamAccumulator,
  PartialToolCall,
  StreamCallbacks,
} from "@/types/streaming";
import { chatStream } from "@providers/chat";
import { getTool, getToolsForApi, refreshMCPTools } from "@tools/index";
import { initializePermissions } from "@services/permissions";
import { MAX_ITERATIONS } from "@constants/agent";
import { createStreamAccumulator } from "@/types/streaming";

// =============================================================================
// Types
// =============================================================================

interface StreamAgentState {
  sessionId: string;
  workingDir: string;
  abort: AbortController;
  options: AgentOptions;
  callbacks: Partial<StreamCallbacks>;
}

// =============================================================================
// State Creation
// =============================================================================

const createStreamAgentState = (
  workingDir: string,
  options: AgentOptions,
  callbacks: Partial<StreamCallbacks>,
): StreamAgentState => ({
  sessionId: uuidv4(),
  workingDir,
  abort: new AbortController(),
  options,
  callbacks,
});

// =============================================================================
// Tool Call Accumulation
// =============================================================================

/**
 * Process a stream chunk and update accumulator
 * Returns true if a complete tool call was assembled
 */
const processStreamChunk = (
  chunk: StreamChunk,
  accumulator: StreamAccumulator,
  callbacks: Partial<StreamCallbacks>,
): ToolCall[] => {
  const completedCalls: ToolCall[] = [];

  const chunkHandlers: Record<StreamChunk["type"], () => void> = {
    content: () => {
      if (chunk.content) {
        accumulator.content += chunk.content;
        callbacks.onContentChunk?.(chunk.content);
      }
    },

    tool_call: () => {
      if (!chunk.toolCall) return;

      const tc = chunk.toolCall;
      const index = tc.id ? getToolCallIndex(tc.id, accumulator) : 0;

      // Get or create partial tool call
      let partial = accumulator.toolCalls.get(index);
      if (!partial && tc.id) {
        partial = {
          index,
          id: tc.id,
          name: tc.function?.name ?? "",
          argumentsBuffer: "",
          isComplete: false,
        };
        accumulator.toolCalls.set(index, partial);
        callbacks.onToolCallStart?.(partial);
      }

      if (partial) {
        // Update name if provided
        if (tc.function?.name) {
          partial.name = tc.function.name;
        }

        // Accumulate arguments
        if (tc.function?.arguments) {
          partial.argumentsBuffer += tc.function.arguments;
        }
      }
    },

    model_switched: () => {
      if (chunk.modelSwitch) {
        accumulator.modelSwitch = chunk.modelSwitch;
        callbacks.onModelSwitch?.(chunk.modelSwitch);
      }
    },

    done: () => {
      // Finalize all pending tool calls
      for (const partial of accumulator.toolCalls.values()) {
        if (!partial.isComplete) {
          partial.isComplete = true;
          const toolCall = finalizeToolCall(partial);
          completedCalls.push(toolCall);
          callbacks.onToolCallComplete?.(toolCall);
        }
      }
      callbacks.onComplete?.();
    },

    error: () => {
      if (chunk.error) {
        callbacks.onError?.(chunk.error);
      }
    },
  };

  const handler = chunkHandlers[chunk.type];
  if (handler) {
    handler();
  }

  return completedCalls;
};

/**
 * Get or assign index for a tool call by ID
 */
const getToolCallIndex = (
  id: string,
  accumulator: StreamAccumulator,
): number => {
  for (const [index, partial] of accumulator.toolCalls.entries()) {
    if (partial.id === id) {
      return index;
    }
  }
  return accumulator.toolCalls.size;
};

/**
 * Convert partial tool call to complete tool call
 */
const finalizeToolCall = (partial: PartialToolCall): ToolCall => {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(partial.argumentsBuffer || "{}");
  } catch {
    args = {};
  }

  return {
    id: partial.id,
    name: partial.name,
    arguments: args,
  };
};

// =============================================================================
// Tool Execution
// =============================================================================

const executeTool = async (
  state: StreamAgentState,
  toolCall: ToolCall,
): Promise<ToolResult> => {
  const tool = getTool(toolCall.name);

  if (!tool) {
    return {
      success: false,
      title: "Unknown tool",
      output: "",
      error: `Tool not found: ${toolCall.name}`,
    };
  }

  const ctx: ToolContext = {
    sessionId: state.sessionId,
    messageId: uuidv4(),
    workingDir: state.workingDir,
    abort: state.abort,
    autoApprove: state.options.autoApprove,
    onMetadata: () => {},
  };

  try {
    const validatedArgs = tool.parameters.parse(toolCall.arguments);
    return await tool.execute(validatedArgs, ctx);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      title: "Tool error",
      output: "",
      error: errorMessage,
    };
  }
};

// =============================================================================
// Streaming LLM Call
// =============================================================================

const callLLMStream = async (
  state: StreamAgentState,
  messages: AgentMessage[],
): Promise<{
  content: string;
  toolCalls: ToolCall[];
}> => {
  const chatMode = state.options.chatMode ?? false;
  const toolDefs = getToolsForApi(chatMode);
  const accumulator = createStreamAccumulator();
  let streamError: string | null = null;
  const completedToolCalls: ToolCall[] = [];

  // Convert messages to provider format
  const providerMessages: Message[] = messages.map((msg) => {
    if ("tool_calls" in msg) {
      return {
        role: "assistant" as const,
        content: msg.content ?? "",
        tool_calls: msg.tool_calls,
      };
    }
    if ("tool_call_id" in msg) {
      return {
        role: "tool" as const,
        tool_call_id: msg.tool_call_id,
        content: msg.content,
      };
    }
    return msg as Message;
  });

  await chatStream(
    state.options.provider,
    providerMessages,
    {
      model: state.options.model,
      tools: toolDefs,
      stream: true,
    },
    (chunk: StreamChunk) => {
      const completed = processStreamChunk(chunk, accumulator, state.callbacks);
      completedToolCalls.push(...completed);

      if (chunk.type === "error") {
        streamError = chunk.error ?? "Unknown stream error";
      }
    },
  );

  if (streamError) {
    throw new Error(streamError);
  }

  return {
    content: accumulator.content,
    toolCalls: completedToolCalls,
  };
};

// =============================================================================
// Main Streaming Agent Loop
// =============================================================================

export const runAgentLoopStream = async (
  state: StreamAgentState,
  messages: Message[],
): Promise<AgentResult> => {
  const maxIterations = state.options.maxIterations ?? MAX_ITERATIONS;
  const allToolCalls: { call: ToolCall; result: ToolResult }[] = [];
  let iterations = 0;
  let finalResponse = "";

  // Initialize
  await initializePermissions();
  await refreshMCPTools();

  const agentMessages: AgentMessage[] = [...messages];

  while (iterations < maxIterations) {
    iterations++;

    try {
      const response = await callLLMStream(state, agentMessages);

      // Check if response has tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Add assistant message with tool calls
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

        // Emit any text content
        if (response.content) {
          state.options.onText?.(response.content);
        }

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          state.options.onToolCall?.(toolCall);

          const result = await executeTool(state, toolCall);
          allToolCalls.push({ call: toolCall, result });

          state.options.onToolResult?.(toolCall.id, result);

          // Add tool result message
          const toolResultMessage: ToolResultMessage = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.error
              ? `Error: ${result.error}\n\n${result.output}`
              : result.output,
          };
          agentMessages.push(toolResultMessage);
        }
      } else {
        // No tool calls - this is the final response
        finalResponse = response.content || "";
        state.options.onText?.(finalResponse);
        break;
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
// Public API
// =============================================================================

/**
 * Create and run a streaming agent with callbacks
 */
export const runStreamingAgent = async (
  prompt: string,
  systemPrompt: string,
  options: AgentOptions,
  callbacks: Partial<StreamCallbacks> = {},
): Promise<AgentResult> => {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const state = createStreamAgentState(process.cwd(), options, callbacks);
  return runAgentLoopStream(state, messages);
};

/**
 * Create a streaming agent instance with stop capability
 */
export const createStreamingAgent = (
  workingDir: string,
  options: AgentOptions,
  callbacks: Partial<StreamCallbacks> = {},
): {
  run: (messages: Message[]) => Promise<AgentResult>;
  stop: () => void;
  updateCallbacks: (newCallbacks: Partial<StreamCallbacks>) => void;
} => {
  const state = createStreamAgentState(workingDir, options, callbacks);

  return {
    run: (messages: Message[]) => runAgentLoopStream(state, messages),
    stop: () => state.abort.abort(),
    updateCallbacks: (newCallbacks: Partial<StreamCallbacks>) => {
      Object.assign(state.callbacks, newCallbacks);
    },
  };
};
