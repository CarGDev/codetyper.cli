/**
 * Streaming Chat TUI Integration
 *
 * Connects the streaming agent loop to the TUI store for real-time updates.
 */

import type { Message } from "@/types/providers";
import type { AgentOptions } from "@interfaces/AgentOptions";
import type { AgentResult } from "@interfaces/AgentResult";
import type { StreamingChatOptions } from "@interfaces/StreamingChatOptions";
import type {
  StreamCallbacks,
  PartialToolCall,
  ModelSwitchInfo,
} from "@/types/streaming";
import type { ToolCall, ToolResult } from "@/types/tools";
import { createStreamingAgent } from "@services/agent-stream";
import { appStore } from "@tui-solid/context/app";

// Re-export for convenience
export type { StreamingChatOptions } from "@interfaces/StreamingChatOptions";

// =============================================================================
// TUI Streaming Callbacks
// =============================================================================

const createTUIStreamCallbacks = (
  options?: Partial<StreamingChatOptions>,
): StreamCallbacks => ({
  onContentChunk: (content: string) => {
    appStore.appendStreamContent(content);
  },

  onToolCallStart: (toolCall: PartialToolCall) => {
    appStore.setCurrentToolCall({
      id: toolCall.id,
      name: toolCall.name,
      description: `Calling ${toolCall.name}...`,
      status: "pending",
    });
  },

  onToolCallComplete: (toolCall: ToolCall) => {
    appStore.updateToolCall({
      id: toolCall.id,
      name: toolCall.name,
      status: "running",
    });
  },

  onModelSwitch: (info: ModelSwitchInfo) => {
    appStore.addLog({
      type: "system",
      content: `Model switched: ${info.from} → ${info.to} (${info.reason})`,
    });
    options?.onModelSwitch?.(info);
  },

  onComplete: () => {
    appStore.completeStreaming();
  },

  onError: (error: string) => {
    appStore.cancelStreaming();
    appStore.addLog({
      type: "error",
      content: error,
    });
  },
});

// =============================================================================
// Agent Options with TUI Integration
// =============================================================================

const createAgentOptionsWithTUI = (
  options: StreamingChatOptions,
): AgentOptions => ({
  ...options,

  onText: (text: string) => {
    // Text is handled by streaming callbacks, but we may want to notify
    options.onText?.(text);
  },

  onToolCall: (toolCall: ToolCall) => {
    appStore.setMode("tool_execution");
    appStore.setCurrentToolCall({
      id: toolCall.id,
      name: toolCall.name,
      description: `Executing ${toolCall.name}...`,
      status: "running",
    });

    appStore.addLog({
      type: "tool",
      content: `${toolCall.name}`,
      metadata: {
        toolName: toolCall.name,
        toolStatus: "running",
        toolDescription: `Executing ${toolCall.name}`,
        toolArgs: toolCall.arguments,
      },
    });

    options.onToolCall?.(toolCall);
  },

  onToolResult: (toolCallId: string, result: ToolResult) => {
    appStore.updateToolCall({
      status: result.success ? "success" : "error",
      result: result.output,
      error: result.error,
    });

    appStore.addLog({
      type: "tool",
      content: result.output || result.error || "",
      metadata: {
        toolName: appStore.getState().currentToolCall?.name,
        toolStatus: result.success ? "success" : "error",
        toolDescription: result.title,
      },
    });

    appStore.setCurrentToolCall(null);
    appStore.setMode("thinking");

    options.onToolResult?.(toolCallId, result);
  },

  onError: (error: string) => {
    appStore.setMode("idle");
    appStore.addLog({
      type: "error",
      content: error,
    });
    options.onError?.(error);
  },

  onWarning: (warning: string) => {
    appStore.addLog({
      type: "system",
      content: warning,
    });
    options.onWarning?.(warning);
  },
});

// =============================================================================
// Main API
// =============================================================================

/**
 * Run a streaming chat session with TUI integration
 */
export const runStreamingChat = async (
  messages: Message[],
  options: StreamingChatOptions,
): Promise<AgentResult> => {
  // Set up TUI state
  appStore.setMode("thinking");
  appStore.startThinking();
  appStore.startStreaming();

  // Create callbacks that update the TUI
  const streamCallbacks = createTUIStreamCallbacks(options);
  const agentOptions = createAgentOptionsWithTUI(options);

  // Create and run the streaming agent
  const agent = createStreamingAgent(
    process.cwd(),
    agentOptions,
    streamCallbacks,
  );

  try {
    const result = await agent.run(messages);

    appStore.stopThinking();
    appStore.setMode("idle");

    return result;
  } catch (error) {
    appStore.cancelStreaming();
    appStore.stopThinking();
    appStore.setMode("idle");

    const errorMessage = error instanceof Error ? error.message : String(error);
    appStore.addLog({
      type: "error",
      content: errorMessage,
    });

    return {
      success: false,
      finalResponse: errorMessage,
      iterations: 0,
      toolCalls: [],
    };
  }
};

/**
 * Create a streaming chat instance with stop capability
 */
export const createStreamingChat = (
  options: StreamingChatOptions,
): {
  run: (messages: Message[]) => Promise<AgentResult>;
  stop: () => void;
} => {
  const streamCallbacks = createTUIStreamCallbacks(options);
  const agentOptions = createAgentOptionsWithTUI(options);

  const agent = createStreamingAgent(
    process.cwd(),
    agentOptions,
    streamCallbacks,
  );

  return {
    run: async (messages: Message[]) => {
      appStore.setMode("thinking");
      appStore.startThinking();
      appStore.startStreaming();

      try {
        const result = await agent.run(messages);

        appStore.stopThinking();
        appStore.setMode("idle");

        return result;
      } catch (error) {
        appStore.cancelStreaming();
        appStore.stopThinking();
        appStore.setMode("idle");

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          finalResponse: errorMessage,
          iterations: 0,
          toolCalls: [],
        };
      }
    },

    stop: () => {
      agent.stop();
      appStore.cancelStreaming();
      appStore.stopThinking();
      appStore.setMode("idle");
    },
  };
};
