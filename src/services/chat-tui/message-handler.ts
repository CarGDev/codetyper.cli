/**
 * Chat TUI message handling
 */

import { addMessage, saveSession } from "@services/session";
import { createStreamingAgent } from "@services/agent-stream";
import { CHAT_MESSAGES } from "@constants/chat-service";
import { enrichMessageWithIssues } from "@services/github-issue-service";
import {
  checkGitHubCLI,
  extractPRUrls,
  fetchPR,
  fetchPRComments,
  formatPRContext,
  formatPendingComments,
} from "@services/github-pr";
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
import {
  compactConversation,
  createCompactionSummary,
  getModelCompactionConfig,
  checkCompactionNeeded,
} from "@services/auto-compaction";
import {
  detectTaskType,
  determineRoute,
  recordAuditResult,
  isCorrection,
  getRoutingExplanation,
} from "@services/provider-quality";
import {
  checkOllamaAvailability,
  checkCopilotAvailability,
} from "@services/cascading-provider";
import { chat } from "@providers/chat";
import { AUDIT_SYSTEM_PROMPT, createAuditPrompt, parseAuditResponse } from "@prompts/audit-prompt";
import { PROVIDER_IDS } from "@constants/provider-quality";
import { appStore } from "@tui/index";
import type { StreamCallbacks } from "@/types/streaming";
import type { TaskType } from "@/types/provider-quality";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
  ToolCallInfo,
} from "@/types/chat-service";

// Track last response for feedback learning
let lastResponseContext: {
  taskType: TaskType;
  provider: string;
  response: string;
} | null = null;

const FILE_MODIFYING_TOOLS = ["write", "edit"];

const createToolCallHandler =
  (
    callbacks: ChatServiceCallbacks,
    toolCallRef: { current: ToolCallInfo | null },
  ) =>
  (call: { id: string; name: string; arguments?: Record<string, unknown> }) => {
    const args = call.arguments;
    if (FILE_MODIFYING_TOOLS.includes(call.name) && args?.path) {
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
const createStreamCallbacks = (): StreamCallbacks => ({
  onContentChunk: (content: string) => {
    appStore.appendStreamContent(content);
  },

  onToolCallStart: (toolCall) => {
    appStore.setCurrentToolCall({
      id: toolCall.id,
      name: toolCall.name,
      description: `Calling ${toolCall.name}...`,
      status: "pending",
    });
  },

  onToolCallComplete: (toolCall) => {
    appStore.updateToolCall({
      id: toolCall.id,
      name: toolCall.name,
      status: "running",
    });
  },

  onModelSwitch: (info) => {
    appStore.addLog({
      type: "system",
      content: `Model switched: ${info.from} → ${info.to} (${info.reason})`,
    });
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

/**
 * Run audit with Copilot on Ollama's response
 */
const runAudit = async (
  userPrompt: string,
  ollamaResponse: string,
  callbacks: ChatServiceCallbacks,
): Promise<{ approved: boolean; hasMajorIssues: boolean; correctedResponse?: string }> => {
  try {
    callbacks.onLog("system", "Auditing response with Copilot...");

    const auditMessages = [
      { role: "system" as const, content: AUDIT_SYSTEM_PROMPT },
      { role: "user" as const, content: createAuditPrompt(userPrompt, ollamaResponse) },
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
      hasMajorIssues: parsed.severity === "major" || parsed.severity === "critical",
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

  // Get interaction mode and cascade setting from app store
  const { interactionMode, cascadeEnabled } = appStore.getState();
  const isReadOnlyMode = interactionMode === "ask" || interactionMode === "code-review";

  if (isReadOnlyMode) {
    const modeLabel = interactionMode === "ask" ? "Ask" : "Code Review";
    callbacks.onLog(
      "system",
      `${modeLabel} mode: Read-only responses (Ctrl+Tab to switch modes)`,
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

      const explanation = await getRoutingExplanation(routingDecision, taskType);
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

  // Start streaming UI
  appStore.setMode("thinking");
  appStore.startThinking();
  appStore.startStreaming();

  const streamCallbacks = createStreamCallbacks();
  const agent = createStreamingAgent(
    process.cwd(),
    {
      provider: effectiveProvider,
      model: state.model,
      verbose: state.verbose,
      autoApprove: state.autoApprove,
      chatMode: isReadOnlyMode,
      onToolCall: createToolCallHandler(callbacks, toolCallRef),
      onToolResult: createToolResultHandler(callbacks, toolCallRef),
      onError: (error) => {
        callbacks.onLog("error", error);
      },
      onWarning: (warning) => {
        callbacks.onLog("system", warning);
      },
    },
    streamCallbacks,
  );

  try {
    const result = await agent.run(state.messages);

    // Stop thinking timer
    appStore.stopThinking();

    if (result.finalResponse) {
      let finalResponse = result.finalResponse;

      // Run audit if cascade mode with Ollama
      if (shouldAudit && effectiveProvider === "ollama") {
        const auditResult = await runAudit(message, result.finalResponse, callbacks);

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
      // Note: Don't call callbacks.onLog here - streaming already added the log entry
      // via appendStreamContent/completeStreaming

      addMessage("user", message);
      addMessage("assistant", finalResponse);
      await saveSession();

      await processLearningsFromExchange(
        message,
        finalResponse,
        callbacks,
      );

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
  }
};
