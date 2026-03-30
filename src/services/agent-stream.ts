/**
 * Streaming Agent Loop
 *
 * Agent loop that streams LLM responses in real-time to the TUI.
 * Handles tool call accumulation mid-stream.
 * Supports pause/resume, step-by-step mode, and abort with rollback.
 */

import { v4 as uuidv4 } from "uuid";
import { logAgent, logTool, logError } from "@utils/debug-logger";
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
import type { ExecutionControlEvents } from "@/types/execution-control";
import { chatStream } from "@providers/core/chat";
import { getTool, getToolsForApi, refreshMCPTools } from "@tools/index";
import { initializePermissions } from "@services/core/permissions";
import { MAX_ITERATIONS, MAX_CONSECUTIVE_ERRORS } from "@constants/agent";
import { createStreamAccumulator } from "@/types/streaming";
import {
  createExecutionControl,
  captureFileState,
} from "@services/execution-control";
import { getActivePlans } from "@services/plan-mode/plan-service";
import { truncateToolOutput } from "@utils/tool-output-truncation";

// =============================================================================
// Constants
// =============================================================================

/**
 * Number of file modifications allowed before plan approval is required
 * After this threshold, agents must use plan_approval tool
 */
const PLAN_APPROVAL_FILE_THRESHOLD = 2;

/**
 * Tools that modify files and require plan approval tracking
 */
const FILE_MODIFYING_TOOLS = new Set(["write", "edit", "delete", "multi_edit", "apply_patch"]);

/**
 * Session-level tracking of modified files for plan approval enforcement.
 * Persists across agent runs within the same session (not reset per message).
 */
const sessionModifiedFiles = new Set<string>();

/** Reset session file tracking (call on new session) */
export const resetSessionModifiedFiles = (): void => {
  sessionModifiedFiles.clear();
};

// =============================================================================
// Types
// =============================================================================

interface StreamAgentState {
  sessionId: string;
  workingDir: string;
  abort: AbortController;
  options: AgentOptions;
  callbacks: Partial<StreamCallbacks>;
  executionControl: ReturnType<typeof createExecutionControl>;
  /** Track files modified in this session for plan approval enforcement */
  modifiedFiles: Set<string>;
  /** Whether plan approval enforcement is enabled */
  enforcePlanApproval: boolean;
}

/**
 * Extended stream callbacks with execution control events
 */
export interface ExtendedStreamCallbacks extends StreamCallbacks {
  onPause?: () => void;
  onResume?: () => void;
  onStepModeEnabled?: () => void;
  onStepModeDisabled?: () => void;
  onWaitingForStep?: (toolName: string, toolArgs: Record<string, unknown>) => void;
  onAbort?: (rollbackCount: number) => void;
  onRollback?: (action: { type: string; description: string }) => void;
  onRollbackComplete?: (actionsRolledBack: number) => void;
}

// =============================================================================
// State Creation
// =============================================================================

const createStreamAgentState = (
  workingDir: string,
  options: AgentOptions,
  callbacks: Partial<ExtendedStreamCallbacks>,
): StreamAgentState => {
  const extendedCallbacks = callbacks as Partial<ExtendedStreamCallbacks>;

  const executionControlEvents: ExecutionControlEvents = {
    onPause: extendedCallbacks.onPause,
    onResume: extendedCallbacks.onResume,
    onStepModeEnabled: extendedCallbacks.onStepModeEnabled,
    onStepModeDisabled: extendedCallbacks.onStepModeDisabled,
    onWaitingForStep: extendedCallbacks.onWaitingForStep,
    onAbort: extendedCallbacks.onAbort,
    onRollback: (action) =>
      extendedCallbacks.onRollback?.({
        type: action.type,
        description: action.description,
      }),
    onRollbackComplete: extendedCallbacks.onRollbackComplete,
  };

  return {
    sessionId: uuidv4(),
    workingDir,
    abort: new AbortController(),
    options,
    callbacks,
    executionControl: createExecutionControl(executionControlEvents),
    modifiedFiles: new Set<string>(),
    enforcePlanApproval: options.enforcePlanApproval ?? true,
  };
};

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

      const tc = chunk.toolCall as {
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      };

      // OpenAI streaming format includes index in each chunk
      // Use index from chunk if available, otherwise find by id or default to 0
      const chunkIndex =
        tc.index ?? (tc.id ? getToolCallIndex(tc.id, accumulator) : 0);

      // Get or create partial tool call
      let partial = accumulator.toolCalls.get(chunkIndex);
      if (!partial) {
        // Create new partial - use id if provided, generate one otherwise
        partial = {
          index: chunkIndex,
          id: tc.id ?? `tool_${chunkIndex}_${Date.now()}`,
          name: tc.function?.name ?? "",
          argumentsBuffer: "",
          isComplete: false,
        };
        accumulator.toolCalls.set(chunkIndex, partial);
        if (tc.id) {
          callbacks.onToolCallStart?.(partial);
        }
      }

      // Update id if provided (first chunk has the real id)
      if (tc.id && partial.id.startsWith("tool_")) {
        partial.id = tc.id;
        callbacks.onToolCallStart?.(partial);
      }

      // Update name if provided
      if (tc.function?.name) {
        partial.name = tc.function.name;
      }

      // Accumulate arguments
      if (tc.function?.arguments) {
        partial.argumentsBuffer += tc.function.arguments;
      }
    },

    model_switched: () => {
      if (chunk.modelSwitch) {
        accumulator.modelSwitch = chunk.modelSwitch;
        callbacks.onModelSwitch?.(chunk.modelSwitch);
      }
    },

    reasoning: () => {
      // Capture reasoning_opaque for multi-turn continuity
      if (chunk.reasoningOpaque) {
        accumulator.reasoningOpaque = chunk.reasoningOpaque;
      }
      // Emit reasoning text as content (visible to user as thinking)
      if (chunk.reasoning) {
        accumulator.content += chunk.reasoning;
        callbacks.onContentChunk?.(chunk.reasoning);
      }
    },

    usage: () => {
      if (chunk.usage) {
        callbacks.onUsage?.(chunk.usage);
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
 * Check if JSON appears to be truncated (incomplete)
 */
const isLikelyTruncatedJson = (jsonStr: string): boolean => {
  const trimmed = jsonStr.trim();
  if (!trimmed) return false;

  // Count braces and brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;

  for (const char of trimmed) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
      if (char === "[") bracketCount++;
      if (char === "]") bracketCount--;
    }
  }

  // If counts are unbalanced, JSON is truncated
  return braceCount !== 0 || bracketCount !== 0 || inString;
};

/**
 * Convert partial tool call to complete tool call
 */
const finalizeToolCall = (partial: PartialToolCall): ToolCall => {
  let args: Record<string, unknown> = {};
  const rawBuffer = partial.argumentsBuffer || "";

  if (!rawBuffer) {
    args = { __debug_error: "Empty arguments buffer" };
  } else {
    try {
      args = JSON.parse(rawBuffer);
    } catch (e) {
      const isTruncated = isLikelyTruncatedJson(rawBuffer);
      const errorType = isTruncated
        ? "JSON truncated (likely max_tokens exceeded)"
        : "JSON parse failed";

      args = {
        __debug_error: errorType,
        __debug_buffer: rawBuffer.substring(0, 200),
        __debug_parseError: e instanceof Error ? e.message : String(e),
        __debug_truncated: isTruncated,
      };
    }
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

/**
 * Tools that modify files and support rollback
 */
const ROLLBACK_CAPABLE_TOOLS: Record<string, "file_write" | "file_edit" | "file_delete" | "bash_command"> = {
  write: "file_write",
  edit: "file_edit",
  delete: "file_delete",
  bash: "bash_command",
};

const executeTool = async (
  state: StreamAgentState,
  toolCall: ToolCall,
): Promise<ToolResult> => {
  logTool(`executing: ${toolCall.name}`, {
    id: toolCall.id,
    args: toolCall.arguments,
  });
  // Check if execution was aborted
  if (state.executionControl.getState() === "aborted") {
    return {
      success: false,
      title: "Aborted",
      output: "",
      error: "Execution was aborted",
    };
  }

  // Wait if paused
  await state.executionControl.waitIfPaused();

  // Wait for step confirmation if in step mode
  await state.executionControl.waitForStep(toolCall.name, toolCall.arguments);

  // Check again after waiting (might have been aborted while waiting)
  if (state.executionControl.getState() === "aborted") {
    return {
      success: false,
      title: "Aborted",
      output: "",
      error: "Execution was aborted",
    };
  }

  // Check for plan approval enforcement on file-modifying tools
  if (state.enforcePlanApproval && FILE_MODIFYING_TOOLS.has(toolCall.name)) {
    const toolFilePath = (toolCall.arguments.filePath ?? toolCall.arguments.file_path) as string | undefined;

    // Track this file modification
    if (toolFilePath) {
      state.modifiedFiles.add(toolFilePath);
      sessionModifiedFiles.add(toolFilePath);
    }

    // Check if we've exceeded the threshold and need plan approval
    if (state.modifiedFiles.size > PLAN_APPROVAL_FILE_THRESHOLD) {
      // Check if there's an approved plan
      const activePlans = getActivePlans();
      const hasApprovedPlan = activePlans.some(
        p => p.status === "approved" || p.status === "executing"
      );

      if (!hasApprovedPlan) {
        return {
          success: false,
          title: "Plan approval required",
          output: "",
          error: `You have modified ${state.modifiedFiles.size} files which exceeds the threshold of ${PLAN_APPROVAL_FILE_THRESHOLD}. ` +
            `Before continuing, you MUST use the plan_approval tool to create and submit an implementation plan for user approval. ` +
            `Use plan_approval action="create" to start, then add steps, context, and risks, finally submit with action="submit". ` +
            `Wait for the user to approve the plan before proceeding with more file modifications.`,
        };
      }
    }
  }

  // Check for debug error markers from truncated/malformed JSON
  const debugError = toolCall.arguments.__debug_error as string | undefined;
  if (debugError) {
    const isTruncated = toolCall.arguments.__debug_truncated === true;
    const title = isTruncated ? "Tool call truncated" : "Tool validation error";
    const hint = isTruncated
      ? "\nHint: The model's response was cut off. Try a simpler request or increase max_tokens."
      : "";

    return {
      success: false,
      title,
      output: "",
      error: `Tool validation error: ${toolCall.name}: ${debugError}${hint}\nReceived: ${JSON.stringify(toolCall.arguments)}`,
    };
  }

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
    provider: state.options.provider,
    onMetadata: () => {},
  };

  // Capture file state for rollback if this is a modifying tool
  const rollbackType = ROLLBACK_CAPABLE_TOOLS[toolCall.name];
  let originalState: { filePath: string; content: string } | null = null;

  // Extract file path - tools use filePath (camelCase), not file_path
  const toolFilePath = (toolCall.arguments.filePath ?? toolCall.arguments.file_path) as string | undefined;

  if (rollbackType && (rollbackType === "file_edit" || rollbackType === "file_delete")) {
    if (toolFilePath) {
      originalState = await captureFileState(toolFilePath);
    }
  }

  try {
    const validatedArgs = tool.parameters.parse(toolCall.arguments);
    const startTime = Date.now();
    const result = await tool.execute(validatedArgs, ctx);
    logTool(`completed: ${toolCall.name}`, { success: result.success, duration: Date.now() - startTime, outputLen: result.output?.length });

    // Record action for rollback if successful and modifying
    if (result.success && rollbackType) {
      state.executionControl.recordAction({
        type: rollbackType,
        description: `${toolCall.name}: ${toolFilePath ?? "unknown file"}`,
        originalState: originalState ?? (toolFilePath ? { filePath: toolFilePath, content: "" } : undefined),
      });
    }

    return result;
  } catch (error: unknown) {
    logError(`tool execution failed: ${toolCall.name}`, error);
    const receivedArgs = JSON.stringify(toolCall.arguments);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      title: "Tool validation error",
      output: "",
      error: `${toolCall.name}: ${errorMessage}\nReceived: ${receivedArgs}`,
    };
  }
};

// =============================================================================
// Parallel Tool Execution
// =============================================================================

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
const MAX_PARALLEL_TOOLS = 10;

/**
 * Execute tool calls with intelligent parallelism
 * - Parallel-safe tools (task_agent, read, glob, grep) run concurrently
 * - File-modifying tools (write, edit, bash) run sequentially
 */
const executeToolCallsWithParallelism = async (
  state: StreamAgentState,
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
  state: StreamAgentState,
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

// =============================================================================
// Streaming LLM Call
// =============================================================================

const callLLMStream = async (
  state: StreamAgentState,
  messages: AgentMessage[],
): Promise<{
  content: string;
  toolCalls: ToolCall[];
  reasoningOpaque?: string;
}> => {
  const chatMode = state.options.chatMode ?? false;
  const toolDefs = getToolsForApi(chatMode, state.options.toolFilter);
  const accumulator = createStreamAccumulator();
  let streamError: string | null = null;
  const completedToolCalls: ToolCall[] = [];

  // Convert messages to provider format
  const providerMessages: Message[] = messages.map((msg) => {
    if ("tool_calls" in msg) {
      const assistantMsg: Message = {
        role: "assistant" as const,
        content: msg.content ?? "",
        tool_calls: msg.tool_calls,
      };
      // Preserve reasoning_opaque for multi-turn reasoning continuity
      if ("reasoning_opaque" in msg && msg.reasoning_opaque) {
        assistantMsg.reasoning_opaque = msg.reasoning_opaque as string;
      }
      return assistantMsg;
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
    reasoningOpaque: accumulator.reasoningOpaque ?? undefined,
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
  let consecutiveErrors = 0;

  // Initialize
  await initializePermissions();

  // Refresh MCP tools and log results
  const mcpResult = await refreshMCPTools();
  if (mcpResult.success && mcpResult.toolCount > 0) {
    state.options.onText?.(`[Loaded ${mcpResult.toolCount} MCP tool(s)]\n`);
  } else if (mcpResult.error) {
    state.options.onWarning?.(`MCP tools unavailable: ${mcpResult.error}`);
  }

  const agentMessages: AgentMessage[] = [...messages];
  logAgent("starting agent loop", { provider: state.options.provider, model: state.options.model, maxIterations, toolFilter: state.options.toolFilter, messageCount: messages.length });

  while (iterations < maxIterations) {
    // Check for abort at start of each iteration
    if (state.executionControl.getState() === "aborted") {
      return {
        success: false,
        finalResponse: "Execution aborted by user",
        iterations,
        toolCalls: allToolCalls,
        stopReason: "aborted",
      };
    }

    // Wait if paused
    await state.executionControl.waitIfPaused();

    iterations++;
    logAgent(`iteration ${iterations}/${maxIterations}`, { messagesInContext: agentMessages.length });

    try {
      const response = await callLLMStream(state, agentMessages);
      logAgent("LLM RESPONSE", {
        contentLen: response.content?.length,
        contentPreview: response.content?.slice(0, 200),
        toolCallCount: response.toolCalls?.length,
        toolCallNames: response.toolCalls?.map((tc) => tc.name),
        hasReasoning: !!response.reasoningOpaque,
      });

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
          // Preserve reasoning_opaque for multi-turn reasoning continuity
          reasoning_opaque: response.reasoningOpaque,
        };
        agentMessages.push(assistantMessage);

        // Emit any text content
        if (response.content) {
          state.options.onText?.(response.content);
        }

        // Track if all tool calls in this iteration failed
        let allFailed = true;

        // Execute tool calls with parallel execution for safe tools
        const toolResults = await executeToolCallsWithParallelism(
          state,
          response.toolCalls,
        );

        // Process results in order
        for (const { toolCall, result } of toolResults) {
          state.options.onToolCall?.(toolCall);
          allToolCalls.push({ call: toolCall, result });
          state.options.onToolResult?.(toolCall.id, result);

          // Track success/failure
          if (result.success) {
            allFailed = false;
            consecutiveErrors = 0;
          }

          // Add tool result message (truncated for search tools, NOT for read/write/edit)
          const rawContent = result.error
            ? `Error: ${result.error}\n\n${result.output}`
            : result.output;
          // Don't truncate file content tools — the model needs full content to edit correctly
          const skipTruncation = new Set(["read", "write", "edit", "multi_edit", "complete_task"]);
          const { content: truncatedContent } = skipTruncation.has(toolCall.name)
            ? { content: rawContent }
            : truncateToolOutput(rawContent);
          const toolResultMessage: ToolResultMessage = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: truncatedContent,
          };
          agentMessages.push(toolResultMessage);
        }

        // Check if complete_task was called — if so, break immediately
        const completionResult = toolResults.find(
          ({ toolCall: tc }) => tc.name === "complete_task",
        );
        if (completionResult) {
          const meta = completionResult.result.metadata;
          const summary = (meta?.summary as string) ?? "";
          logAgent("COMPLETE_TASK called via tool", { result: meta?.result, summary });
          finalResponse = summary;
          state.options.onText?.(summary);
          break;
        }

        // Check for repeated failures
        if (allFailed) {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            const errorMsg = `Stopping after ${consecutiveErrors} consecutive tool errors. The task may be incomplete — try rephrasing or check model compatibility with tool calling.`;
            state.options.onError?.(errorMsg);
            return {
              success: false,
              finalResponse: errorMsg,
              iterations,
              toolCalls: allToolCalls,
              stopReason: "consecutive_errors",
            };
          }
        }
      } else {
        // No tool calls — model returned text without calling any tools.
        // Check if complete_task was called in this iteration's tool results.
        const completionCall = allToolCalls.find(
          (tc) => tc.call.name === "complete_task",
        );

        if (completionCall) {
          // Agent explicitly signaled completion via complete_task tool
          const summary = completionCall.result.metadata?.summary as string ?? response.content ?? "";
          logAgent("COMPLETE_TASK called", { result: completionCall.result.metadata?.result, summary });
          finalResponse = summary || response.content || "";
          state.options.onText?.(finalResponse);
          break;
        }

        // In chat mode, text-only responses are fine (user is asking questions)
        if (state.options.chatMode) {
          finalResponse = response.content || "";
          state.options.onText?.(finalResponse);
          break;
        }

        // Not chat mode and no complete_task → force continuation
        const content = response.content || "";

        // Safety valve: if we've been going for too many iterations, accept the response
        if (iterations >= maxIterations - 2) {
          logAgent("SAFETY: accepting text response near max iterations", { iterations });
          finalResponse = content;
          state.options.onText?.(finalResponse);
          break;
        }

        // Inject nudge: tell the agent it must use tools or call complete_task
        logAgent("FORCE CONTINUE: model returned text without complete_task", { contentLen: content.length, iterations });
        agentMessages.push({
          role: "assistant" as const,
          content,
        });
        agentMessages.push({
          role: "user" as const,
          content: "You must either use tools to implement changes, or call complete_task to signal you are done. Do not respond with just text.",
        });
      }
    } catch (error: unknown) {
      logError(`agent loop error at iteration ${iterations}`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      state.options.onError?.(`Agent error: ${errorMessage}`);
      return {
        success: false,
        finalResponse: `Error: ${errorMessage}`,
        iterations,
        toolCalls: allToolCalls,
        stopReason: "error",
      };
    }
  }

  const hitMaxIterations = iterations >= maxIterations;

  if (hitMaxIterations) {
    const warnMsg = `Agent reached max iterations (${maxIterations}). ` +
      `Completed ${allToolCalls.length} tool call(s) across ${iterations} iteration(s). ` +
      `The task may be incomplete — you can send another message to continue.`;
    state.options.onWarning?.(warnMsg);
  }

  const stopReason = hitMaxIterations ? "max_iterations" : "completed";
  logAgent("AGENT LOOP COMPLETE", {
    success: true,
    iterations,
    toolCallCount: allToolCalls.length,
    toolCallNames: allToolCalls.map((tc) => tc.call.name),
    stopReason,
    responseLen: finalResponse.length,
  });

  return {
    success: true,
    finalResponse,
    iterations,
    toolCalls: allToolCalls,
    stopReason,
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
  callbacks: Partial<ExtendedStreamCallbacks> = {},
): Promise<AgentResult> => {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const state = createStreamAgentState(process.cwd(), options, callbacks);
  return runAgentLoopStream(state, messages);
};

/**
 * Streaming agent instance with full execution control
 */
export interface StreamingAgentInstance {
  /** Run the agent with given messages */
  run: (messages: Message[]) => Promise<AgentResult>;
  /** Stop the agent (abort without rollback) */
  stop: () => void;
  /** Update callbacks */
  updateCallbacks: (newCallbacks: Partial<ExtendedStreamCallbacks>) => void;
  /** Pause execution */
  pause: () => void;
  /** Resume execution */
  resume: () => void;
  /** Abort with optional rollback */
  abort: (rollback?: boolean) => Promise<void>;
  /** Enable/disable step-by-step mode */
  stepMode: (enabled: boolean) => void;
  /** Advance one step in step mode */
  step: () => void;
  /** Get current execution state */
  getExecutionState: () => "running" | "paused" | "stepping" | "aborted" | "completed";
  /** Check if waiting for step confirmation */
  isWaitingForStep: () => boolean;
  /** Get count of rollback actions available */
  getRollbackCount: () => number;
}

/**
 * Create a streaming agent instance with full execution control
 */
export const createStreamingAgent = (
  workingDir: string,
  options: AgentOptions,
  callbacks: Partial<ExtendedStreamCallbacks> = {},
): StreamingAgentInstance => {
  const state = createStreamAgentState(workingDir, options, callbacks);
  const control = state.executionControl;

  return {
    run: (messages: Message[]) => runAgentLoopStream(state, messages),
    stop: () => {
      state.abort.abort();
      control.abort(false);
    },
    updateCallbacks: (newCallbacks: Partial<ExtendedStreamCallbacks>) => {
      Object.assign(state.callbacks, newCallbacks);
    },
    pause: () => control.pause(),
    resume: () => control.resume(),
    abort: (rollback = false) => control.abort(rollback),
    stepMode: (enabled: boolean) => control.stepMode(enabled),
    step: () => control.step(),
    getExecutionState: () => control.getState(),
    isWaitingForStep: () => control.isWaitingForStep(),
    getRollbackCount: () => control.getRollbackActions().length,
  };
};

// Re-export types for external use
export type { ExecutionControl, ExecutionControlEvents } from "@/types/execution-control";
