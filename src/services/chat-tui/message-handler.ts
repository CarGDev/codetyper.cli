/**
 * Chat TUI message handling
 */

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
      rollback ? "Operation aborted with rollback" : "Operation aborted by user",
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

const createToolCallHandler =
  (
    callbacks: ChatServiceCallbacks,
    toolCallRef: { current: ToolCallInfo | null },
  ) =>
  (call: { id: string; name: string; arguments?: Record<string, unknown> }) => {
    const args = call.arguments;
    if (
      (FILE_MODIFYING_TOOLS as readonly string[]).includes(call.name) &&
      args?.path
    ) {
      toolCallRef.current = { name: call.name, path: String(args.path) };
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
    if (result.success && toolCallRef.current?.path) {
      analyzeFileChange(toolCallRef.current.path);
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

  const callbacks: StreamCallbacks = {
    onContentChunk: (content: string) => {
      chunkCount++;
      addDebugLog(
        "stream",
        `Chunk #${chunkCount}: "${content.substring(0, 30)}${content.length > 30 ? "..." : ""}"`,
      );
      appStore.appendStreamContent(content);
    },

    onToolCallStart: (toolCall) => {
      addDebugLog("tool", `Tool start: ${toolCall.name} (${toolCall.id})`);
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

    onComplete: () => {
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
      callbacks.onLog("system", `Plan "${plan.title}" approved. Proceeding with implementation.`);
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
      callbacks.onLog("system", `Plan "${plan.title}" rejected. Please provide feedback or a new approach.`);
      addDebugLog("state", `Plan ${plan.id} rejected by user`);

      // Add rejection to messages so agent can respond
      state.messages.push({
        role: "user",
        content: `The user rejected the plan with feedback: "${message}". Please revise the approach.`,
      });
      // Fall through to normal agent processing to get revised plan
    } else {
      // Neither approval nor rejection - treat as feedback/modification request
      callbacks.onLog("system", `Plan "${plan.title}" awaiting approval. Reply 'yes' to approve or 'no' to reject.`);

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

  state.messages.push({ role: "user", content: userMessage });

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
        addDebugLog("info", `onText callback: "${text.substring(0, 50)}..."`);
        appStore.appendStreamContent(text);
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
      onWaitingForStep: (toolName: string, _toolArgs: Record<string, unknown>) => {
        appStore.addLog({
          type: "system",
          content: `⏳ Step mode: Ready to execute ${toolName}. Press Enter to continue.`,
        });
        addDebugLog("state", `Waiting for step: ${toolName}`);
      },
      onAbort: (rollbackCount: number) => {
        addDebugLog("state", `Abort initiated, ${rollbackCount} actions to rollback`);
      },
      onRollback: (action: { type: string; description: string }) => {
        appStore.addLog({
          type: "system",
          content: `↩ Rolling back: ${action.description}`,
        });
        addDebugLog("state", `Rollback: ${action.type} - ${action.description}`);
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

  try {
    addDebugLog(
      "api",
      `Agent.run() started with ${state.messages.length} messages`,
    );
    const result = await agent.run(state.messages);
    addDebugLog(
      "api",
      `Agent.run() completed: success=${result.success}, iterations=${result.iterations}`,
    );

    // Stop thinking timer
    appStore.stopThinking();

    if (result.finalResponse) {
      addDebugLog(
        "info",
        `Final response length: ${result.finalResponse.length} chars`,
      );
      let finalResponse = result.finalResponse;

      // Run audit if cascade mode with Ollama
      if (shouldAudit && effectiveProvider === "ollama") {
        const auditResult = await runAudit(
          message,
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

      // Check if streaming content was received - if not, add the response as a log
      // This handles cases where streaming didn't work or content was all in final response
      if (!streamState.hasReceivedContent() && finalResponse) {
        addDebugLog(
          "info",
          "No streaming content received, adding fallback log",
        );
        // Streaming didn't receive content, manually add the response
        appStore.cancelStreaming(); // Remove empty streaming log
        appStore.addLog({
          type: "assistant",
          content: finalResponse,
        });
      } else {
        // Streaming received content - finalize the streaming log
        addDebugLog("info", "Completing streaming with received content");
        appStore.completeStreaming();
      }

      addMessage("user", message);
      addMessage("assistant", finalResponse);
      await saveSession();

      await processLearningsFromExchange(message, finalResponse, callbacks);

      const suggestions = getPendingSuggestions();
      if (suggestions.length > 0) {
        const formatted = formatSuggestions(suggestions);
        callbacks.onLog("system", formatted);
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
