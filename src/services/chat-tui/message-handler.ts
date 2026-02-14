/**
 * Chat TUI message handling
 */

import { v4 as uuidv4 } from "uuid";
import { addMessage, saveSession } from "@services/core/session";
import {
  createStreamingAgent,
  type StreamingAgentInstance,
} from "@services/agent-stream";
import { CHAT_MESSAGES } from "@constants/chat-service";
import { enrichMessageWithIssues } from "@services/github-issue-service";
import { checkGitHubCLI } from "@services/github-pr/cli";
import { extractPRUrls } from "@services/github-pr/url";
import { fetchPR, fetchPRComments } from "@services/github-pr/fetch";
import {
  formatPRContext,
  formatPendingComments,
} from "@services/github-pr/format";
import {
  analyzeFileChange,
  clearSuggestions,
  getPendingSuggestions,
  formatSuggestions,
} from "@services/command-suggestion-service";
import {
  processFileReferences,
  buildContextMessage,
} from "@services/chat-tui/files";
import { getToolDescription } from "@services/chat-tui/utils";
import { processLearningsFromExchange } from "@services/chat-tui/learnings";
import { rebuildSystemPromptForMode } from "@services/chat-tui/initialize";
import {
  compactConversation,
  createCompactionSummary,
  getModelCompactionConfig,
  checkCompactionNeeded,
} from "@services/auto-compaction";
import { detectTaskType } from "@services/provider-quality/task-detector";
import {
  determineRoute,
  getRoutingExplanation,
} from "@services/provider-quality/router";
import { recordAuditResult } from "@services/provider-quality/score-manager";
import { isCorrection } from "@services/provider-quality/feedback-detector";
import {
  checkOllamaAvailability,
  checkCopilotAvailability,
} from "@services/cascading-provider/availability";
import { chat, getDefaultModel } from "@providers/core/chat";
import {
  AUDIT_SYSTEM_PROMPT,
  createAuditPrompt,
  parseAuditResponse,
} from "@prompts/audit-prompt";
import { PROVIDER_IDS } from "@constants/provider-quality";
import { appStore } from "@tui-solid/context/app";
import type { StreamCallbacks } from "@/types/streaming";
import type { TaskType } from "@/types/provider-quality";
import type { ContentPart, MessageContent } from "@/types/providers";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
  ToolCallInfo,
} from "@/types/chat-service";
import { addDebugLog } from "@tui-solid/components/logs/debug-log-panel";
import { FILE_MODIFYING_TOOLS } from "@constants/tools";
import type { StreamCallbacksWithState } from "@interfaces/StreamCallbacksWithState";
import {
  detectCommand,
  executeDetectedCommand,
} from "@services/command-detection";
import { detectSkillCommand, executeSkill } from "@services/skill-service";
import {
  buildSkillInjectionForPrompt,
  getDetectedSkillsSummary,
} from "@services/skill-registry";
import { stripMarkdown } from "@/utils/markdown/strip";
import { createThinkingParser } from "@services/reasoning/thinking-parser";
import {
  getActivePlans,
  isApprovalMessage,
  isRejectionMessage,
  approvePlan,
  rejectPlan,
  startPlanExecution,
  formatPlanForDisplay,
} from "@services/plan-mode/plan-service";

// Track last response for feedback learning
let lastResponseContext: {
  taskType: TaskType;
  provider: string;
  response: string;
} | null = null;

// Track current running agent for execution control
let currentAgent: StreamingAgentInstance | null = null;

/**
 * Abort the currently running agent operation
 * @param rollback - If true, attempt to rollback file changes
 * @returns true if an operation was aborted, false if nothing was running
 */
export const abortCurrentOperation = async (
  rollback = false,
): Promise<boolean> => {
  if (currentAgent) {
    await currentAgent.abort(rollback);
    currentAgent = null;
    appStore.cancelStreaming();
    appStore.stopThinking();
    appStore.setMode("idle");
    addDebugLog(
      "state",
      rollback
        ? "Operation aborted with rollback"
        : "Operation aborted by user",
    );
    return true;
  }
  return false;
};

/**
 * Pause the currently running agent operation
 * @returns true if operation was paused, false if nothing was running
 */
export const pauseCurrentOperation = (): boolean => {
  if (currentAgent && currentAgent.getExecutionState() === "running") {
    currentAgent.pause();
    appStore.addLog({
      type: "system",
      content: "⏸ Execution paused. Press Ctrl+P to resume.",
    });
    addDebugLog("state", "Operation paused by user");
    return true;
  }
  return false;
};

/**
 * Resume the currently paused agent operation
 * @returns true if operation was resumed, false if nothing was paused
 */
export const resumeCurrentOperation = (): boolean => {
  if (currentAgent && currentAgent.getExecutionState() === "paused") {
    currentAgent.resume();
    appStore.addLog({
      type: "system",
      content: "▶ Execution resumed.",
    });
    addDebugLog("state", "Operation resumed by user");
    return true;
  }
  return false;
};

/**
 * Toggle pause/resume for current operation
 * @returns true if state changed, false if nothing running
 */
export const togglePauseResume = (): boolean => {
  if (!currentAgent) return false;

  const state = currentAgent.getExecutionState();
  if (state === "running" || state === "stepping") {
    return pauseCurrentOperation();
  }
  if (state === "paused") {
    return resumeCurrentOperation();
  }
  return false;
};

/**
 * Enable/disable step-by-step mode for current operation
 * @param enabled - Whether step mode should be enabled
 * @returns true if mode was changed
 */
export const setStepMode = (enabled: boolean): boolean => {
  if (!currentAgent) return false;

  currentAgent.stepMode(enabled);
  appStore.addLog({
    type: "system",
    content: enabled
      ? "🚶 Step mode enabled. Press Enter to advance each tool call."
      : "🏃 Step mode disabled. Execution will continue automatically.",
  });
  addDebugLog("state", `Step mode ${enabled ? "enabled" : "disabled"}`);
  return true;
};

/**
 * Advance one step in step-by-step mode
 * @returns true if step was advanced
 */
export const advanceStep = (): boolean => {
  if (currentAgent && currentAgent.isWaitingForStep()) {
    currentAgent.step();
    addDebugLog("state", "Step advanced by user");
    return true;
  }
  return false;
};

/**
 * Get current execution state
 */
export const getExecutionState = (): {
  state: "idle" | "running" | "paused" | "stepping" | "aborted" | "completed";
  rollbackCount: number;
  waitingForStep: boolean;
} => {
  if (!currentAgent) {
    return { state: "idle", rollbackCount: 0, waitingForStep: false };
  }
  return {
    state: currentAgent.getExecutionState(),
    rollbackCount: currentAgent.getRollbackCount(),
    waitingForStep: currentAgent.isWaitingForStep(),
  };
};

/**
 * Extract file path(s) from a tool call's arguments.
 *
 * Different tools store the path in different places:
 * - write / edit / delete : `args.filePath` or `args.path`
 * - multi_edit           : `args.edits[].file_path`
 * - apply_patch          : `args.targetFile` (or parsed from patch header)
 * - bash                 : no reliable path, skip
 */
const extractToolPaths = (
  toolName: string,
  args?: Record<string, unknown>,
): { primary?: string; all: string[] } => {
  if (!args) return { all: [] };

  // Standard single-file tools
  const singlePath =
    (args.filePath as string) ??
    (args.file_path as string) ??
    (args.path as string);

  if (singlePath && toolName !== "multi_edit") {
    return { primary: String(singlePath), all: [String(singlePath)] };
  }

  // multi_edit: array of edits with file_path
  if (toolName === "multi_edit" && Array.isArray(args.edits)) {
    const paths = (args.edits as Array<{ file_path?: string }>)
      .map((e) => e.file_path)
      .filter((p): p is string => Boolean(p));
    const unique = [...new Set(paths)];
    return { primary: unique[0], all: unique };
  }

  // apply_patch: targetFile override or embedded in patch content
  if (toolName === "apply_patch" && args.targetFile) {
    return { primary: String(args.targetFile), all: [String(args.targetFile)] };
  }

  return { all: [] };
};

const createToolCallHandler =
  (
    callbacks: ChatServiceCallbacks,
    toolCallRef: { current: ToolCallInfo | null },
  ) =>
  (call: { id: string; name: string; arguments?: Record<string, unknown> }) => {
    const args = call.arguments;
    const isModifying = (FILE_MODIFYING_TOOLS as readonly string[]).includes(
      call.name,
    );

    if (isModifying) {
      const { primary, all } = extractToolPaths(call.name, args);
      toolCallRef.current = { name: call.name, path: primary, paths: all };
    } else {
      toolCallRef.current = { name: call.name };
    }

    callbacks.onModeChange("tool_execution");
    callbacks.onToolCall({
      id: call.id,
      name: call.name,
      description: getToolDescription(call),
      args,
    });
  };

/**
 * Estimate additions/deletions from tool output text
 */
const estimateChanges = (
  output: string,
): { additions: number; deletions: number } => {
  let additions = 0;
  let deletions = 0;

  for (const line of output.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  // Fallback estimate when no diff markers are found
  if (additions === 0 && deletions === 0 && output.length > 0) {
    additions = output.split("\n").length;
  }

  return { additions, deletions };
};

const createToolResultHandler =
  (
    callbacks: ChatServiceCallbacks,
    toolCallRef: { current: ToolCallInfo | null },
  ) =>
  (
    _callId: string,
    result: {
      success: boolean;
      title: string;
      output?: string;
      error?: string;
    },
  ) => {
    const ref = toolCallRef.current;

    if (result.success && ref) {
      const output = result.output ?? "";
      const paths = ref.paths?.length ? ref.paths : ref.path ? [ref.path] : [];

      if (paths.length > 0) {
        const { additions, deletions } = estimateChanges(output);

        // Distribute changes across paths (or assign all to the single path)
        const perFile = paths.length > 1
          ? {
              additions: Math.max(1, Math.ceil(additions / paths.length)),
              deletions: Math.ceil(deletions / paths.length),
            }
          : { additions, deletions };

        for (const filePath of paths) {
          analyzeFileChange(filePath);
          appStore.addModifiedFile({
            filePath,
            additions: perFile.additions,
            deletions: perFile.deletions,
            lastModified: Date.now(),
          });
        }
      }
    }

    callbacks.onToolResult(
      result.success,
      result.title,
      result.success ? result.output : undefined,
      result.error,
    );
    callbacks.onModeChange("thinking");
  };

/**
 * Create streaming callbacks for TUI integration
 */
const createStreamCallbacks = (): StreamCallbacksWithState => {
  let chunkCount = 0;
  let currentSegmentHasContent = false;
  let receivedUsage = false;
  const thinkingParser = createThinkingParser();

  const emitThinking = (thinking: string | null): void => {
    if (!thinking) return;
    appStore.addLog({ type: "thinking", content: thinking });
  };

  /**
   * Finalize the current streaming segment (if it has content) so that
   * tool logs appear below the pre-tool text and a new streaming segment
   * can be started afterward for post-tool text (e.g. summary).
   */
  const finalizeCurrentSegment = (): void => {
    if (!currentSegmentHasContent) return;

    // Flush thinking parser before finalizing the segment
    const flushed = thinkingParser.flush();
    if (flushed.visible) {
      appStore.appendStreamContent(flushed.visible);
    }
    emitThinking(flushed.thinking);

    appStore.completeStreaming();
    currentSegmentHasContent = false;
    addDebugLog("stream", "Finalized streaming segment before tool call");
  };

  const callbacks: StreamCallbacks = {
    onContentChunk: (content: string) => {
      chunkCount++;
      addDebugLog(
        "stream",
        `Chunk #${chunkCount}: "${content.substring(0, 30)}${content.length > 30 ? "..." : ""}"`,
      );

      // Feed through the thinking parser — only append visible content.
      // <thinking>…</thinking> blocks are stripped and emitted separately.
      const result = thinkingParser.feed(content);
      if (result.visible) {
        // If the previous streaming segment was finalized (e.g. before a tool call),
        // start a new one so post-tool text appears after tool output logs.
        if (!currentSegmentHasContent && !appStore.getState().streamingLog.isStreaming) {
          appStore.startStreaming();
          addDebugLog("stream", "Started new streaming segment for post-tool content");
        }
        appStore.appendStreamContent(result.visible);
        currentSegmentHasContent = true;
      }
      emitThinking(result.thinking);
    },

    onToolCallStart: (toolCall) => {
      addDebugLog("tool", `Tool start: ${toolCall.name} (${toolCall.id})`);

      // Finalize accumulated streaming text so it stays above tool output
      // and the post-tool summary will appear below.
      finalizeCurrentSegment();

      appStore.setCurrentToolCall({
        id: toolCall.id,
        name: toolCall.name,
        description: `Calling ${toolCall.name}...`,
        status: "pending",
      });
    },

    onToolCallComplete: (toolCall) => {
      addDebugLog("tool", `Tool complete: ${toolCall.name}`);
      appStore.updateToolCall({
        id: toolCall.id,
        name: toolCall.name,
        status: "running",
      });
    },

    onModelSwitch: (info) => {
      addDebugLog("api", `Model switch: ${info.from} → ${info.to}`);
      appStore.addLog({
        type: "system",
        content: `Model switched: ${info.from} → ${info.to} (${info.reason})`,
      });
    },

    onUsage: (usage) => {
      receivedUsage = true;
      addDebugLog(
        "api",
        `Token usage: prompt=${usage.promptTokens}, completion=${usage.completionTokens}`,
      );
      appStore.addTokens(usage.promptTokens, usage.completionTokens);
    },

    onComplete: () => {
      // Flush any remaining buffered content from the thinking parser
      const flushed = thinkingParser.flush();
      if (flushed.visible) {
        // Ensure a streaming log exists if we're flushing post-tool content
        if (!currentSegmentHasContent && !appStore.getState().streamingLog.isStreaming) {
          appStore.startStreaming();
        }
        appStore.appendStreamContent(flushed.visible);
        currentSegmentHasContent = true;
      }
      emitThinking(flushed.thinking);

      // Note: Don't call completeStreaming() here!
      // The agent loop may have multiple iterations (tool calls + final response)
      // Streaming will be completed manually after the entire agent finishes
      addDebugLog(
        "stream",
        `Stream iteration done (${chunkCount} chunks total)`,
      );
    },

    onError: (error: string) => {
      addDebugLog("error", `Stream error: ${error}`);
      thinkingParser.reset();
      appStore.cancelStreaming();
      appStore.addLog({
        type: "error",
        content: error,
      });
    },
  };

  return {
    callbacks,
    hasReceivedContent: () => chunkCount > 0,
    hasReceivedUsage: () => receivedUsage,
  };
};

/**
 * Run audit with Copilot on Ollama's response
 */
const runAudit = async (
  userPrompt: string,
  ollamaResponse: string,
  callbacks: ChatServiceCallbacks,
): Promise<{
  approved: boolean;
  hasMajorIssues: boolean;
  correctedResponse?: string;
}> => {
  try {
    callbacks.onLog("system", "Auditing response with Copilot...");

    const auditMessages = [
      { role: "system" as const, content: AUDIT_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: createAuditPrompt(userPrompt, ollamaResponse),
      },
    ];

    const auditResponse = await chat("copilot", auditMessages, {});
    const parsed = parseAuditResponse(auditResponse.content ?? "");

    if (parsed.approved) {
      callbacks.onLog("system", "✓ Audit passed - response approved");
    } else {
      const issueCount = parsed.issues.length;
      callbacks.onLog(
        "system",
        `⚠ Audit found ${issueCount} issue(s): ${parsed.issues.slice(0, 2).join(", ")}${issueCount > 2 ? "..." : ""}`,
      );
    }

    return {
      approved: parsed.approved,
      hasMajorIssues:
        parsed.severity === "major" || parsed.severity === "critical",
      correctedResponse: parsed.correctedResponse,
    };
  } catch (error) {
    callbacks.onLog("system", "Audit skipped due to error");
    return { approved: true, hasMajorIssues: false };
  }
};

/**
 * Check for user feedback on previous response and update quality scores
 */
const checkUserFeedback = async (
  message: string,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  if (!lastResponseContext) return;

  if (isCorrection(message)) {
    callbacks.onLog(
      "system",
      `Learning: Recording correction feedback for ${lastResponseContext.provider}`,
    );

    await recordAuditResult(
      lastResponseContext.provider,
      lastResponseContext.taskType,
      false,
      true,
    );
  }

  // Clear context after checking
  lastResponseContext = null;
};

export const handleMessage = async (
  state: ChatServiceState,
  message: string,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  // Check for feedback on previous response
  await checkUserFeedback(message, callbacks);

  // Check for pending plan approvals
  const pendingPlans = getActivePlans().filter((p) => p.status === "pending");
  if (pendingPlans.length > 0) {
    const plan = pendingPlans[0];

    // Check if this is an approval message
    if (isApprovalMessage(message)) {
      approvePlan(plan.id, message);
      startPlanExecution(plan.id);
      callbacks.onLog(
        "system",
        `Plan "${plan.title}" approved. Proceeding with implementation.`,
      );
      addDebugLog("state", `Plan ${plan.id} approved by user`);

      // Continue with agent execution - the agent will see the approved status
      // and proceed with implementation
      state.messages.push({
        role: "user",
        content: `The user approved the plan. Proceed with the implementation of plan "${plan.title}".`,
      });
      // Fall through to normal agent processing
    } else if (isRejectionMessage(message)) {
      rejectPlan(plan.id, message);
      callbacks.onLog(
        "system",
        `Plan "${plan.title}" rejected. Please provide feedback or a new approach.`,
      );
      addDebugLog("state", `Plan ${plan.id} rejected by user`);

      // Add rejection to messages so agent can respond
      state.messages.push({
        role: "user",
        content: `The user rejected the plan with feedback: "${message}". Please revise the approach.`,
      });
      // Fall through to normal agent processing to get revised plan
    } else {
      // Neither approval nor rejection - treat as feedback/modification request
      callbacks.onLog(
        "system",
        `Plan "${plan.title}" awaiting approval. Reply 'yes' to approve or 'no' to reject.`,
      );

      // Show the plan again with the feedback
      const planDisplay = formatPlanForDisplay(plan);
      appStore.addLog({
        type: "system",
        content: planDisplay,
      });

      // Add user's feedback to messages
      state.messages.push({
        role: "user",
        content: `The user provided feedback on the pending plan: "${message}". Please address this feedback and update the plan.`,
      });
      // Fall through to normal agent processing
    }
  }

  // Check for skill commands (e.g., /review, /commit)
  const skillMatch = await detectSkillCommand(message);
  if (skillMatch) {
    addDebugLog("info", `Detected skill: /${skillMatch.skill.command}`);
    callbacks.onLog("system", `Running skill: ${skillMatch.skill.name}`);

    // Execute the skill and get the expanded prompt
    const { expandedPrompt } = executeSkill(skillMatch.skill, skillMatch.args);

    // Show the original command
    appStore.addLog({
      type: "user",
      content: message,
    });

    // Process the expanded prompt as the actual message
    // Fall through to normal processing with the expanded prompt
    message = expandedPrompt;
    addDebugLog(
      "info",
      `Expanded skill prompt: ${expandedPrompt.substring(0, 100)}...`,
    );
  }

  // Detect explicit command requests and execute directly
  const detected = detectCommand(message);
  if (detected.detected && detected.command) {
    addDebugLog("info", `Detected command: ${detected.command}`);

    // Show the user's request
    appStore.addLog({
      type: "user",
      content: message,
    });

    // Show what we're running
    appStore.addLog({
      type: "tool",
      content: detected.command,
      metadata: {
        toolName: "bash",
        toolStatus: "running",
        toolDescription: `Running: ${detected.command}`,
      },
    });

    appStore.setMode("tool_execution");
    const result = await executeDetectedCommand(
      detected.command,
      process.cwd(),
    );
    appStore.setMode("idle");

    // Show result
    if (result.success && result.output) {
      appStore.addLog({
        type: "assistant",
        content: result.output,
      });
    } else if (!result.success) {
      appStore.addLog({
        type: "error",
        content: result.error || "Command failed",
      });
    }

    // Save to session (for persistence only, not UI)
    await saveSession();
    return;
  }

  // Get interaction mode and cascade setting from app store
  const { interactionMode, cascadeEnabled } = appStore.getState();
  const isReadOnlyMode =
    interactionMode === "ask" || interactionMode === "code-review";

  // Rebuild system prompt if mode has changed
  if (state.currentMode !== interactionMode) {
    await rebuildSystemPromptForMode(state, interactionMode);
    callbacks.onLog("system", `Switched to ${interactionMode} mode`);
  }

  if (isReadOnlyMode) {
    const modeLabel = interactionMode === "ask" ? "Ask" : "Code Review";
    callbacks.onLog(
      "system",
      `${modeLabel} mode: Read-only tools only (Ctrl+M to switch modes)`,
    );
  }

  let processedMessage = await processFileReferences(state, message);

  // In code-review mode, check for PR URLs and enrich with PR context
  if (interactionMode === "code-review") {
    const prUrls = extractPRUrls(message);

    if (prUrls.length > 0) {
      const ghStatus = await checkGitHubCLI();

      if (!ghStatus.installed) {
        callbacks.onLog(
          "system",
          "GitHub CLI (gh) is not installed. Install it to enable PR review features: https://cli.github.com/",
        );
      } else if (!ghStatus.authenticated) {
        callbacks.onLog(
          "system",
          "GitHub CLI is not authenticated. Run 'gh auth login' to enable PR review features.",
        );
      } else {
        // Fetch PR details for each URL
        for (const prUrl of prUrls) {
          callbacks.onLog(
            "system",
            `Fetching PR #${prUrl.prNumber} from ${prUrl.owner}/${prUrl.repo}...`,
          );

          const pr = await fetchPR(prUrl);
          if (pr) {
            const prContext = formatPRContext(pr);
            const comments = await fetchPRComments(prUrl);
            const commentsContext =
              comments.length > 0 ? formatPendingComments(comments) : "";

            processedMessage = `${processedMessage}\n\n---\n\n${prContext}${commentsContext ? `\n\n${commentsContext}` : ""}`;

            callbacks.onLog(
              "system",
              `Loaded PR #${pr.number}: ${pr.title} (+${pr.additions} -${pr.deletions}, ${comments.length} comment(s))`,
            );
          } else {
            callbacks.onLog(
              "system",
              `Could not fetch PR #${prUrl.prNumber}. Make sure you have access to the repository.`,
            );
          }
        }
      }
    }
  }

  const { enrichedMessage, issues } =
    await enrichMessageWithIssues(processedMessage);

  // Inline @mention subagent invocation (e.g. "Find all API endpoints @explore")
  try {
    const mentionRegex = /@([a-zA-Z_]+)/g;
    const mentionMap: Record<string, string> = {
      explore: "explore",
      general: "implement",
      plan: "plan",
    };

    const mentions: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(message))) {
      const key = m[1]?.toLowerCase();
      if (key && mentionMap[key]) mentions.push(key);
    }

    if (mentions.length > 0) {
      // Clean message to use as task prompt (remove mentions)
      const cleaned = enrichedMessage.replace(/@[a-zA-Z_]+/g, "").trim();

      // Lazy import task agent helpers (avoid circular deps)
      const { executeTaskAgent, getBackgroundAgentStatus } =
        await import("@/tools/task-agent/execute");
      const { v4: uuidv4 } = await import("uuid");

      // Minimal tool context for invoking the task agent
      const toolCtx = {
        sessionId: uuidv4(),
        messageId: uuidv4(),
        workingDir: process.cwd(),
        abort: new AbortController(),
        autoApprove: true,
        onMetadata: () => {},
      } as any;

      for (const key of mentions) {
        const agentType = mentionMap[key];
        try {
          const params = {
            agent_type: agentType,
            task: cleaned || message,
            run_in_background: true,
          } as any;

          const startResult = await executeTaskAgent(params, toolCtx);

          // Show started message in UI
          appStore.addLog({
            type: "system",
            content: `Started subagent @${key} (ID: ${startResult.metadata?.agentId ?? "?"}).`,
          });

          // Poll briefly for completion and attach result if ready
          const agentId = startResult.metadata?.agentId as string | undefined;
          if (agentId) {
            const maxAttempts = 10;
            const interval = 300;
            for (let i = 0; i < maxAttempts; i++) {
              // eslint-disable-next-line no-await-in-loop
              const status = await getBackgroundAgentStatus(agentId);
              if (status && status.success && status.output) {
                // Attach assistant result to conversation
                appStore.addLog({ type: "assistant", content: status.output });
                addMessage("assistant", status.output);
                await saveSession();
                break;
              }
              // eslint-disable-next-line no-await-in-loop
              await new Promise((res) => setTimeout(res, interval));
            }
          }
        } catch (err) {
          appStore.addLog({
            type: "error",
            content: `Subagent @${key} failed to start: ${String(err)}`,
          });
        }
      }
    }
  } catch (err) {
    // Non-fatal - don't block main flow on subagent helpers
    addDebugLog("error", `Subagent invocation error: ${String(err)}`);
  }

  if (issues.length > 0) {
    callbacks.onLog(
      "system",
      CHAT_MESSAGES.GITHUB_ISSUES_FOUND(
        issues.length,
        issues.map((i) => `#${i.number}`).join(", "),
      ),
    );
  }

  const userMessage = buildContextMessage(state, enrichedMessage);

  // Build multimodal content if there are pasted images
  const { pastedImages } = appStore.getState();
  let messageContent: MessageContent = userMessage;

  if (pastedImages.length > 0) {
    const parts: ContentPart[] = [
      { type: "text", text: userMessage },
    ];

    for (const img of pastedImages) {
      parts.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mediaType};base64,${img.data}`,
          detail: "auto",
        },
      });
    }

    messageContent = parts;
    addDebugLog(
      "info",
      `[images] Attached ${pastedImages.length} image(s) to user message`,
    );
    // Images are consumed; clear from store
    appStore.clearPastedImages();
  }

  state.messages.push({ role: "user", content: messageContent });

  clearSuggestions();

  // Get model-specific compaction config based on context window size
  const config = getModelCompactionConfig(state.model);
  const { needsCompaction } = checkCompactionNeeded(state.messages, config);

  if (needsCompaction) {
    appStore.setIsCompacting(true);
    callbacks.onLog("system", CHAT_MESSAGES.COMPACTION_STARTING);

    const { messages: compactedMessages, result: compactionResult } =
      compactConversation(state.messages, config);

    if (compactionResult.compacted) {
      const summary = createCompactionSummary(compactionResult);
      callbacks.onLog("system", summary);
      state.messages = compactedMessages;
      callbacks.onLog("system", CHAT_MESSAGES.COMPACTION_CONTINUING);
    }

    appStore.setIsCompacting(false);
  }

  const toolCallRef: { current: ToolCallInfo | null } = { current: null };

  // Determine routing for cascade mode
  const taskType = detectTaskType(message);
  let effectiveProvider = state.provider;
  let shouldAudit = false;

  if (cascadeEnabled && !isReadOnlyMode) {
    const ollamaStatus = await checkOllamaAvailability();
    const copilotStatus = await checkCopilotAvailability();

    // If Ollama not available, fallback to Copilot with a message
    if (!ollamaStatus.available) {
      effectiveProvider = "copilot";
      shouldAudit = false;
      callbacks.onLog(
        "system",
        `Ollama not available (${ollamaStatus.error ?? "not running"}). Using Copilot.`,
      );
    } else if (!copilotStatus.available) {
      // If Copilot not available, use Ollama only
      effectiveProvider = "ollama";
      shouldAudit = false;
      callbacks.onLog("system", "Copilot not available. Using Ollama only.");
    } else {
      // Both available - use routing logic
      const routingDecision = await determineRoute({
        taskType,
        ollamaAvailable: ollamaStatus.available,
        copilotAvailable: copilotStatus.available,
        cascadeEnabled: true,
      });

      const explanation = await getRoutingExplanation(
        routingDecision,
        taskType,
      );
      callbacks.onLog("system", explanation);

      if (routingDecision === "ollama_only") {
        effectiveProvider = "ollama";
        shouldAudit = false;
      } else if (routingDecision === "copilot_only") {
        effectiveProvider = "copilot";
        shouldAudit = false;
      } else if (routingDecision === "cascade") {
        effectiveProvider = "ollama";
        shouldAudit = true;
      }
    }
  }

  // Determine the correct model for the provider
  // If provider changed, use the provider's default model instead of state.model
  const effectiveModel =
    effectiveProvider === state.provider
      ? state.model
      : getDefaultModel(effectiveProvider);

  // Auto-detect and inject relevant skills based on the user prompt.
  // Skills are activated transparently and their instructions are injected
  // into the conversation as a system message so the agent benefits from
  // specialized knowledge (e.g., TypeScript, React, Security, etc.).
  try {
    const { injection, detected } =
      await buildSkillInjectionForPrompt(message);
    if (detected.length > 0 && injection) {
      const summary = getDetectedSkillsSummary(detected);
      addDebugLog("info", `[skills] ${summary}`);
      callbacks.onLog("system", summary);

      // Inject skill context as a system message right before the user message
      // so the agent has specialized knowledge for this prompt.
      const insertIdx = Math.max(0, state.messages.length - 1);
      state.messages.splice(insertIdx, 0, {
        role: "system" as const,
        content: injection,
      });
      addDebugLog(
        "info",
        `[skills] Injected ${detected.length} skill(s) as system context`,
      );
    }
  } catch (error) {
    addDebugLog(
      "error",
      `Skill detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Start streaming UI
  addDebugLog(
    "state",
    `Starting request: provider=${effectiveProvider}, model=${effectiveModel}`,
  );
  addDebugLog(
    "state",
    `Mode: ${appStore.getState().interactionMode}, Cascade: ${cascadeEnabled}`,
  );
  appStore.setMode("thinking");
  appStore.startThinking();
  appStore.startStreaming();
  addDebugLog("state", "Streaming started");

  const streamState = createStreamCallbacks();
  const agent = createStreamingAgent(
    process.cwd(),
    {
      provider: effectiveProvider,
      model: effectiveModel,
      verbose: state.verbose,
      autoApprove: state.autoApprove,
      chatMode: isReadOnlyMode,
      onText: (text: string) => {
        // Note: Do NOT call appStore.appendStreamContent() here.
        // Streaming content is already handled by onContentChunk in streamState.callbacks.
        // Calling appendStreamContent from both onText and onContentChunk causes double content.
        addDebugLog("info", `onText callback: "${text.substring(0, 50)}..."`);
      },
      onToolCall: createToolCallHandler(callbacks, toolCallRef),
      onToolResult: createToolResultHandler(callbacks, toolCallRef),
      onError: (error) => {
        callbacks.onLog("error", error);
      },
      onWarning: (warning) => {
        callbacks.onLog("system", warning);
      },
    },
    {
      ...streamState.callbacks,
      // Execution control callbacks
      onPause: () => {
        addDebugLog("state", "Execution paused");
      },
      onResume: () => {
        addDebugLog("state", "Execution resumed");
      },
      onStepModeEnabled: () => {
        addDebugLog("state", "Step mode enabled");
      },
      onStepModeDisabled: () => {
        addDebugLog("state", "Step mode disabled");
      },
      onWaitingForStep: (
        toolName: string,
        _toolArgs: Record<string, unknown>,
      ) => {
        appStore.addLog({
          type: "system",
          content: `⏳ Step mode: Ready to execute ${toolName}. Press Enter to continue.`,
        });
        addDebugLog("state", `Waiting for step: ${toolName}`);
      },
      onAbort: (rollbackCount: number) => {
        addDebugLog(
          "state",
          `Abort initiated, ${rollbackCount} actions to rollback`,
        );
      },
      onRollback: (action: { type: string; description: string }) => {
        appStore.addLog({
          type: "system",
          content: `↩ Rolling back: ${action.description}`,
        });
        addDebugLog(
          "state",
          `Rollback: ${action.type} - ${action.description}`,
        );
      },
      onRollbackComplete: (actionsRolledBack: number) => {
        appStore.addLog({
          type: "system",
          content: `✓ Rollback complete. ${actionsRolledBack} action(s) undone.`,
        });
        addDebugLog("state", `Rollback complete: ${actionsRolledBack} actions`);
      },
    },
  );

  // Store agent reference for abort capability
  currentAgent = agent;

  /**
   * Process the result of an agent run: finalize streaming, show stop reason,
   * persist to session.
   */
  const processAgentResult = async (
    result: Awaited<ReturnType<typeof agent.run>>,
    userMessage: string,
  ): Promise<void> => {
    // Stop thinking timer
    appStore.stopThinking();

    // If the stream didn't deliver API-reported usage data, estimate tokens
    // from message lengths so the context counter never stays stuck at 0.
    if (!streamState.hasReceivedUsage()) {
      const inputEstimate = Math.ceil(userMessage.length / 4);
      const outputEstimate = Math.ceil((result.finalResponse?.length ?? 0) / 4);
      // Add tool I/O overhead: each tool call/result adds tokens
      const toolOverhead = result.toolCalls.length * 150; // ~150 tokens per tool exchange
      if (inputEstimate > 0 || outputEstimate > 0) {
        appStore.addTokens(inputEstimate + toolOverhead, outputEstimate + toolOverhead);
        addDebugLog(
          "info",
          `Token estimate (no API usage): ~${inputEstimate + toolOverhead} in, ~${outputEstimate + toolOverhead} out`,
        );
      }
    }

    if (result.finalResponse) {
      addDebugLog(
        "info",
        `Final response length: ${result.finalResponse.length} chars`,
      );
      let finalResponse = result.finalResponse;

      // Run audit if cascade mode with Ollama
      if (shouldAudit && effectiveProvider === "ollama") {
        const auditResult = await runAudit(
          userMessage,
          result.finalResponse,
          callbacks,
        );

        // Record quality score based on audit
        await recordAuditResult(
          PROVIDER_IDS.OLLAMA,
          taskType,
          auditResult.approved,
          auditResult.hasMajorIssues,
        );

        // Use corrected response if provided
        if (!auditResult.approved && auditResult.correctedResponse) {
          finalResponse = auditResult.correctedResponse;
          callbacks.onLog("system", "Using corrected response from audit");
        }
      }

      // Store context for feedback learning
      lastResponseContext = {
        taskType,
        provider: effectiveProvider,
        response: finalResponse,
      };

      state.messages.push({
        role: "assistant",
        content: finalResponse,
      });

      // Single source of truth: decide based on whether the provider
      // actually streamed visible content, not whether we asked for streaming.
      const streamedContent = streamState.hasReceivedContent();

      if (streamedContent) {
        // Streaming delivered content — finalize the last streaming segment.
        addDebugLog("info", "Completing streaming with received content");
        if (appStore.getState().streamingLog.isStreaming) {
          appStore.completeStreaming();
        }
      } else if (finalResponse) {
        addDebugLog(
          "info",
          "No streaming content received, adding fallback log",
        );
        if (appStore.getState().streamingLog.isStreaming) {
          appStore.cancelStreaming();
        }
        appStore.addLog({
          type: "assistant",
          content: stripMarkdown(finalResponse),
        });
      }

      // Persist to session
      addMessage("user", userMessage);
      addMessage("assistant", finalResponse);
      await saveSession();

      await processLearningsFromExchange(userMessage, finalResponse, callbacks);

      const suggestions = getPendingSuggestions();
      if (suggestions.length > 0) {
        const formatted = formatSuggestions(suggestions);
        callbacks.onLog("system", formatted);
      }
    }

    // Show agent stop reason to the user so they know why it ended
    const stopReason = result.stopReason ?? "completed";
    const toolCount = result.toolCalls.length;
    const iters = result.iterations;

    if (stopReason === "max_iterations") {
      appStore.addLog({
        type: "system",
        content: `Agent stopped: reached max iterations (${iters}). ` +
          `${toolCount} tool call(s) completed. ` +
          `Send another message to continue where it left off.`,
      });
    } else if (stopReason === "consecutive_errors") {
      appStore.addLog({
        type: "error",
        content: `Agent stopped: repeated tool failures. ${toolCount} tool call(s) attempted across ${iters} iteration(s).`,
      });
    } else if (stopReason === "aborted") {
      appStore.addLog({
        type: "system",
        content: `Agent aborted by user after ${iters} iteration(s) and ${toolCount} tool call(s).`,
      });
    } else if (stopReason === "error") {
      appStore.addLog({
        type: "error",
        content: `Agent encountered an error after ${iters} iteration(s) and ${toolCount} tool call(s).`,
      });
    } else if (stopReason === "completed" && toolCount > 0) {
      // Only show a summary for non-trivial agent runs (with tool calls)
      appStore.addLog({
        type: "system",
        content: `Agent completed: ${toolCount} tool call(s) in ${iters} iteration(s).`,
      });
    }
  };

  try {
    addDebugLog(
      "api",
      `Agent.run() started with ${state.messages.length} messages`,
    );
    let result = await agent.run(state.messages);
    addDebugLog(
      "api",
      `Agent.run() completed: success=${result.success}, iterations=${result.iterations}, stopReason=${result.stopReason}`,
    );

    await processAgentResult(result, message);

    // After agent finishes, check for pending plans and auto-continue on approval
    let continueAfterPlan = true;
    while (continueAfterPlan) {
      continueAfterPlan = false;

      const newPendingPlans = getActivePlans().filter(
        (p) => p.status === "pending",
      );
      if (newPendingPlans.length === 0) break;

      const plan = newPendingPlans[0];
      const planContent = formatPlanForDisplay(plan);
      addDebugLog("state", `Showing plan approval modal: ${plan.id}`);

      const approved = await new Promise<boolean>((resolve) => {
        appStore.setMode("plan_approval");
        appStore.setPlanApprovalPrompt({
          id: uuidv4(),
          planTitle: plan.title,
          planSummary: plan.summary,
          planContent,
          resolve: (response) => {
            appStore.setPlanApprovalPrompt(null);

            if (response.approved) {
              approvePlan(plan.id, response.editMode);
              startPlanExecution(plan.id);
              addDebugLog("state", `Plan ${plan.id} approved via modal`);
              appStore.addLog({
                type: "system",
                content: `Plan "${plan.title}" approved. Continuing implementation...`,
              });

              state.messages.push({
                role: "user",
                content: `The user approved the plan "${plan.title}". ` +
                  `Proceed with the full implementation — complete ALL steps in the plan. ` +
                  `Do not stop until every step is done or you need further user input.`,
              });
            } else {
              rejectPlan(plan.id, response.feedback ?? "User cancelled");
              addDebugLog("state", `Plan ${plan.id} rejected via modal`);
              appStore.addLog({
                type: "system",
                content: `Plan "${plan.title}" cancelled.`,
              });
            }

            resolve(response.approved);
          },
        });
      });

      // If the plan was approved, re-run the agent loop so it continues working
      if (approved) {
        addDebugLog("api", "Re-running agent after plan approval");
        appStore.setMode("thinking");
        appStore.startThinking();
        appStore.startStreaming();

        result = await agent.run(state.messages);
        addDebugLog(
          "api",
          `Agent.run() (post-plan) completed: success=${result.success}, iterations=${result.iterations}, stopReason=${result.stopReason}`,
        );

        await processAgentResult(result, message);

        // Loop again to check for new pending plans from this agent run
        continueAfterPlan = true;
      } else {
        appStore.setMode("idle");
      }
    }
  } catch (error) {
    appStore.cancelStreaming();
    appStore.stopThinking();
    callbacks.onLog("error", String(error));
  } finally {
    // Clear agent reference when done
    currentAgent = null;
  }
};
