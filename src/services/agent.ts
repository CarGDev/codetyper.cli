/**
 * Agent system for autonomous task execution
 *
 * This module handles the core agent loop:
 * 1. Send messages to LLM with tools
 * 2. Process tool calls from response
 * 3. Execute tools and collect results
 * 4. Send results back to LLM
 * 5. Repeat until LLM responds with text only
 */

import chalk from "chalk";
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

/**
 * Agent state interface
 */
interface AgentState {
  sessionId: string;
  workingDir: string;
  abort: AbortController;
  options: AgentOptions;
}

/**
 * Create a new agent state
 */
const createAgentState = (
  workingDir: string,
  options: AgentOptions,
): AgentState => ({
  sessionId: uuidv4(),
  workingDir,
  abort: new AbortController(),
  options,
});

/**
 * Call the LLM with tools
 */
const callLLM = async (
  state: AgentState,
  messages: AgentMessage[],
): Promise<{
  content: string | null;
  toolCalls?: ToolCall[];
}> => {
  const toolDefs = getToolsForApi();

  // Convert messages to provider format
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

  // Call provider with tools
  const response = await providerChat(
    state.options.provider,
    providerMessages as Message[],
    {
      model: state.options.model,
      tools: toolDefs,
    },
  );

  // Track usage if available
  if (response.usage) {
    usageStore.addUsage({
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      model: state.options.model,
    });
  }

  // Parse tool calls from response
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

  return {
    content: response.content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
};

/**
 * Execute a tool call
 */
const executeTool = async (
  state: AgentState,
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
    onMetadata: (metadata) => {
      if (state.options.verbose && metadata.output) {
        // Already printed by the tool
      }
    },
  };

  try {
    // Validate arguments
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

/**
 * Run the agent with the given messages
 */
export const runAgentLoop = async (
  state: AgentState,
  messages: Message[],
): Promise<AgentResult> => {
  const maxIterations = state.options.maxIterations ?? MAX_ITERATIONS;
  const allToolCalls: { call: ToolCall; result: ToolResult }[] = [];
  let iterations = 0;
  let finalResponse = "";

  // Initialize permissions
  await initializePermissions();

  // Refresh MCP tools if available
  await refreshMCPTools();

  // Convert messages to agent format
  const agentMessages: AgentMessage[] = [...messages];

  while (iterations < maxIterations) {
    iterations++;

    if (state.options.verbose) {
      console.log(chalk.gray(`\n--- Iteration ${iterations} ---`));
    }

    try {
      // Call LLM with tools
      const response = await callLLM(state, agentMessages);

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

        // If there's text content, emit it
        if (response.content) {
          state.options.onText?.(response.content);
        }

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          state.options.onToolCall?.(toolCall);

          if (state.options.verbose) {
            console.log(chalk.cyan(`\nTool: ${toolCall.name}`));
            console.log(
              chalk.gray(JSON.stringify(toolCall.arguments, null, 2)),
            );
          }

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

/**
 * Create and run an agent with a single prompt
 */
export const runAgent = async (
  prompt: string,
  systemPrompt: string,
  options: AgentOptions,
): Promise<AgentResult> => {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const state = createAgentState(process.cwd(), options);
  return runAgentLoop(state, messages);
};

/**
 * Create an agent instance with stop capability
 */
export const createAgent = (
  workingDir: string,
  options: AgentOptions,
): {
  run: (messages: Message[]) => Promise<AgentResult>;
  stop: () => void;
} => {
  const state = createAgentState(workingDir, options);

  return {
    run: (messages: Message[]) => runAgentLoop(state, messages),
    stop: () => state.abort.abort(),
  };
};

// Re-export types
export type { AgentOptions, AgentResult };
