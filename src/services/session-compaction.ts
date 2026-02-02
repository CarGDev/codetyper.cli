/**
 * Session Compaction Service
 *
 * Integrates auto-compaction with the agent loop and hooks system.
 * Follows OpenCode's two-tier approach: pruning (remove old tool output)
 * and compaction (summarize for fresh context).
 */

import type { Message } from "@/types/providers";
import {
  CHARS_PER_TOKEN,
  TOKEN_OVERFLOW_THRESHOLD,
  PRUNE_MINIMUM_TOKENS,
  PRUNE_PROTECT_TOKENS,
  PRUNE_RECENT_TURNS,
  PRUNE_PROTECTED_TOOLS,
  TOKEN_MESSAGES,
} from "@constants/token";
import { getModelContextSize, DEFAULT_CONTEXT_SIZE } from "@constants/copilot";
import {
  compactConversation,
  checkCompactionNeeded,
  getModelCompactionConfig,
  createCompactionSummary,
} from "@services/auto-compaction";
import { appStore } from "@tui-solid/context/app";

/**
 * Estimate tokens from content
 */
export const estimateTokens = (content: string): number => {
  return Math.max(0, Math.round((content || "").length / CHARS_PER_TOKEN));
};

/**
 * Estimate total tokens in message array
 */
export const estimateMessagesTokens = (messages: Message[]): number => {
  return messages.reduce((total, msg) => {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    return total + estimateTokens(content);
  }, 0);
};

/**
 * Check if context overflow is imminent
 */
export const isContextOverflow = (
  messages: Message[],
  modelId?: string,
): boolean => {
  const contextSize = modelId
    ? getModelContextSize(modelId)
    : DEFAULT_CONTEXT_SIZE;
  const currentTokens = estimateMessagesTokens(messages);
  const threshold = contextSize.input * TOKEN_OVERFLOW_THRESHOLD;
  return currentTokens >= threshold;
};

/**
 * Prune old tool outputs from messages
 *
 * Strategy (following OpenCode):
 * 1. Walk backwards through messages
 * 2. Skip first N user turns (protect recent context)
 * 3. Mark tool outputs for pruning once we accumulate enough tokens
 * 4. Only prune if we can free minimum threshold
 */
export const pruneToolOutputs = (
  messages: Message[],
  options: {
    minTokensToFree?: number;
    protectThreshold?: number;
    recentTurns?: number;
    protectedTools?: Set<string>;
  } = {},
): { messages: Message[]; prunedCount: number; tokensSaved: number } => {
  const {
    minTokensToFree = PRUNE_MINIMUM_TOKENS,
    protectThreshold = PRUNE_PROTECT_TOKENS,
    recentTurns = PRUNE_RECENT_TURNS,
    protectedTools = PRUNE_PROTECTED_TOOLS,
  } = options;

  // Find tool messages to potentially prune
  interface PruneCandidate {
    index: number;
    tokens: number;
  }

  const candidates: PruneCandidate[] = [];
  let userTurnCount = 0;
  let totalPrunableTokens = 0;

  // Walk backwards through messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    // Count user turns
    if (msg.role === "user") {
      userTurnCount++;
    }

    // Skip if in protected recent turns
    if (userTurnCount < recentTurns) {
      continue;
    }

    // Check for tool messages
    if (msg.role === "tool") {
      // Extract tool name from tool_call_id if possible
      const toolName = (msg as { tool_call_id?: string }).tool_call_id
        ?.split("-")[0] ?? "";

      // Skip protected tools
      if (protectedTools.has(toolName)) {
        continue;
      }

      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      const tokens = estimateTokens(content);
      totalPrunableTokens += tokens;

      // Only mark for pruning after we've accumulated enough
      if (totalPrunableTokens > protectThreshold) {
        candidates.push({ index: i, tokens });
      }
    }
  }

  // Calculate total tokens to save
  const tokensSaved = candidates.reduce((sum, c) => sum + c.tokens, 0);

  // Only prune if we can free minimum threshold
  if (tokensSaved < minTokensToFree) {
    return { messages, prunedCount: 0, tokensSaved: 0 };
  }

  // Create pruned messages
  const prunedIndices = new Set(candidates.map((c) => c.index));
  const prunedMessages = messages.map((msg, index) => {
    if (prunedIndices.has(index)) {
      // Replace content with truncation marker
      return {
        ...msg,
        content: "[Output pruned to save context]",
      };
    }
    return msg;
  });

  return {
    messages: prunedMessages,
    prunedCount: candidates.length,
    tokensSaved,
  };
};

/**
 * Perform full session compaction
 *
 * 1. First try pruning tool outputs
 * 2. If still over threshold, do full compaction
 */
export const performSessionCompaction = async (
  messages: Message[],
  modelId?: string,
  options?: {
    onPruneStart?: () => void;
    onPruneComplete?: (count: number, saved: number) => void;
    onCompactStart?: () => void;
    onCompactComplete?: (saved: number) => void;
  },
): Promise<{
  messages: Message[];
  compacted: boolean;
  pruned: boolean;
  tokensSaved: number;
}> => {
  const config = getModelCompactionConfig(modelId);

  // Phase 1: Try pruning first
  options?.onPruneStart?.();
  const pruneResult = pruneToolOutputs(messages);

  if (pruneResult.prunedCount > 0) {
    options?.onPruneComplete?.(pruneResult.prunedCount, pruneResult.tokensSaved);

    // Check if pruning was enough
    const afterPruneCheck = checkCompactionNeeded(pruneResult.messages, config);
    if (!afterPruneCheck.needsCompaction) {
      return {
        messages: pruneResult.messages,
        compacted: false,
        pruned: true,
        tokensSaved: pruneResult.tokensSaved,
      };
    }
  }

  // Phase 2: Full compaction needed
  options?.onCompactStart?.();
  const compactResult = compactConversation(
    pruneResult.prunedCount > 0 ? pruneResult.messages : messages,
    config,
  );

  if (compactResult.result.compacted) {
    options?.onCompactComplete?.(compactResult.result.tokensSaved);
  }

  const totalSaved = pruneResult.tokensSaved + compactResult.result.tokensSaved;

  return {
    messages: compactResult.messages,
    compacted: compactResult.result.compacted,
    pruned: pruneResult.prunedCount > 0,
    tokensSaved: totalSaved,
  };
};

/**
 * Create a compaction check middleware for the agent loop
 */
export const createCompactionMiddleware = (
  modelId?: string,
): {
  shouldCompact: (messages: Message[]) => boolean;
  compact: (
    messages: Message[],
  ) => Promise<{ messages: Message[]; summary: string }>;
} => {
  return {
    shouldCompact: (messages: Message[]) => isContextOverflow(messages, modelId),

    compact: async (messages: Message[]) => {
      // Notify UI that compaction is starting
      appStore.setIsCompacting(true);

      try {
        const result = await performSessionCompaction(messages, modelId, {
          onPruneStart: () => {
            appStore.setThinkingMessage("Pruning old tool outputs...");
          },
          onPruneComplete: (count, saved) => {
            appStore.addLog({
              type: "system",
              content: `Pruned ${count} tool outputs (${saved.toLocaleString()} tokens)`,
            });
          },
          onCompactStart: () => {
            appStore.setThinkingMessage(TOKEN_MESSAGES.COMPACTION_STARTING);
          },
          onCompactComplete: (saved) => {
            appStore.addLog({
              type: "system",
              content: TOKEN_MESSAGES.COMPACTION_COMPLETE(saved),
            });
          },
        });

        // Build summary
        const parts: string[] = [];
        if (result.pruned) {
          parts.push("pruned old outputs");
        }
        if (result.compacted) {
          parts.push("compacted conversation");
        }
        const summary =
          parts.length > 0
            ? `Context management: ${parts.join(", ")} (${result.tokensSaved.toLocaleString()} tokens saved)`
            : "";

        return {
          messages: result.messages,
          summary,
        };
      } finally {
        appStore.setIsCompacting(false);
        appStore.setThinkingMessage(null);
      }
    },
  };
};

/**
 * Get compaction status for display
 */
export const getCompactionStatus = (
  messages: Message[],
  modelId?: string,
): {
  currentTokens: number;
  maxTokens: number;
  usagePercent: number;
  needsCompaction: boolean;
} => {
  const contextSize = modelId
    ? getModelContextSize(modelId)
    : DEFAULT_CONTEXT_SIZE;
  const currentTokens = estimateMessagesTokens(messages);
  const maxTokens = contextSize.input;
  const usagePercent = maxTokens > 0 ? (currentTokens / maxTokens) * 100 : 0;

  return {
    currentTokens,
    maxTokens,
    usagePercent,
    needsCompaction: isContextOverflow(messages, modelId),
  };
};
