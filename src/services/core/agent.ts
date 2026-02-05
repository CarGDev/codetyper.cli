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
import { chat as providerChat } from "@providers/core/chat";
import { getTool, getToolsForApi, refreshMCPTools } from "@tools/index";
import type { ToolContext, ToolCall, ToolResult } from "@/types/tools";
import { initializePermissions } from "@services/core/permissions";
import {
  loadHooks,
  executePreToolUseHooks,
  executePostToolUseHooks,
} from "@services/hooks-service";
import { MAX_ITERATIONS } from "@constants/agent";
import { usageStore } from "@stores/core/usage-store";

/**
 * Tools that are safe to execute in parallel (read-only or isolated)
 */
const PARALLEL_SAFE_TOOLS = new Set([
  "task_agent",  // Subagent spawning - designed for parallel execution
  "read",        // Read-only
  "glob",        // Read-only
  "grep",        // Read-only
  "web_search",  // External API, no local state
  "web_fetch",   // External API, no local state
  "todo_read",   // Read-only
  "lsp",         // Read-only queries
]);

/**
 * Maximum number of parallel tool executions
 */
const MAX_PARALLEL_TOOLS = 3;

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

  // Call provider with tools and model-specific params
  const response = await providerChat(
    state.options.provider,
    providerMessages as Message[],
    {
      model: state.options.model,
      tools: toolDefs,
      temperature: state.options.modelParams?.temperature,
      maxTokens: state.options.modelParams?.maxTokens,
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
 * Execute a tool call with hook support
 */
const executeTool = async (
  state: AgentState,
  toolCall: ToolCall,
): Promise<ToolResult> => {
  // Execute PreToolUse hooks
  const hookResult = await executePreToolUseHooks(
    state.sessionId,
    toolCall.name,
    toolCall.arguments,
    state.workingDir,
  );

  // Handle hook results
  if (hookResult.action === "block") {
    return {
      success: false,
      title: "Blocked by hook",
      output: "",
      error: hookResult.message,
    };
  }

  if (hookResult.action === "warn") {
    state.options.onWarning?.(hookResult.message);
  }

  // Apply modified arguments if hook returned them
  const effectiveArgs =
    hookResult.action === "modify"
      ? { ...toolCall.arguments, ...hookResult.updatedInput }
      : toolCall.arguments;

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

  let result: ToolResult;

  try {
    // Validate arguments
    const validatedArgs = tool.parameters.parse(effectiveArgs);
    result = await tool.execute(validatedArgs, ctx);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result = {
      success: false,
      title: "Tool error",
      output: "",
      error: errorMessage,
    };
  }

  // Execute PostToolUse hooks (fire-and-forget, don't block on result)
  executePostToolUseHooks(
    state.sessionId,
    toolCall.name,
    effectiveArgs,
    result,
    state.workingDir,
  ).catch(() => {
    // Silently ignore post-hook errors
  });

  return result;
};

/**
 * Execute tool calls with intelligent parallelism
 * - Parallel-safe tools (task_agent, read, glob, grep) run concurrently
 * - File-modifying tools (write, edit, bash) run sequentially
 */
const executeToolCallsWithParallelism = async (
  state: AgentState,
  toolCalls: ToolCall[],
): Promise<Array<{ toolCall: ToolCall; result: ToolResult }>> => {
  // Separate into parallel-safe and sequential groups
  const parallelCalls: ToolCall[] = [];
  const sequentialCalls: ToolCall[] = [];

  for (const tc of toolCalls) {
    if (PARALLEL_SAFE_TOOLS.has(tc.name)) {
      parallelCalls.push(tc);
    } else {
      sequentialCalls.push(tc);
    }
  }

  const results: Array<{ toolCall: ToolCall; result: ToolResult }> = [];

  // Execute parallel-safe tools in parallel (up to MAX_PARALLEL_TOOLS at a time)
  if (parallelCalls.length > 0) {
    const parallelResults = await executeInParallelChunks(
      state,
      parallelCalls,
      MAX_PARALLEL_TOOLS,
    );
    results.push(...parallelResults);
  }

  // Execute sequential tools one at a time
  for (const toolCall of sequentialCalls) {
    const result = await executeTool(state, toolCall);
    results.push({ toolCall, result });
  }

  // Return results in original order
  return toolCalls.map((tc) => {
    const found = results.find((r) => r.toolCall.id === tc.id);
    return found ?? { toolCall: tc, result: { success: false, title: "Error", output: "", error: "Tool result not found" } };
  });
};

/**
 * Execute tools in parallel chunks
 */
const executeInParallelChunks = async (
  state: AgentState,
  toolCalls: ToolCall[],
  chunkSize: number,
): Promise<Array<{ toolCall: ToolCall; result: ToolResult }>> => {
  const results: Array<{ toolCall: ToolCall; result: ToolResult }> = [];

  // Process in chunks of chunkSize
  for (let i = 0; i < toolCalls.length; i += chunkSize) {
    const chunk = toolCalls.slice(i, i + chunkSize);

    // Execute chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(async (toolCall) => {
        const result = await executeTool(state, toolCall);
        return { toolCall, result };
      }),
    );

    results.push(...chunkResults);
  }

  return results;
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

  // Load hooks
  await loadHooks(state.workingDir);

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

        // Execute tool calls with parallel execution for safe tools
        const toolResults = await executeToolCallsWithParallelism(
          state,
          response.toolCalls,
        );

        // Process results in order
        for (const { toolCall, result } of toolResults) {
          state.options.onToolCall?.(toolCall);

          if (state.options.verbose) {
            console.log(chalk.cyan(`\nTool: ${toolCall.name}`));
            console.log(
              chalk.gray(JSON.stringify(toolCall.arguments, null, 2)),
            );
          }

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
