/**
 * Auto-Compaction Service
 * Automatically compacts conversation context when approaching token limits
 */

import type { Message } from "@/types/providers";
import type {
  CompressibleMessage,
  CompressibleToolResult,
  CompressionOutput,
} from "@/types/reasoning";
import {
  DEFAULT_MAX_CONTEXT_TOKENS,
  COMPACTION_TRIGGER_PERCENT,
} from "@constants/reasoning";
import { getModelContextSize, DEFAULT_CONTEXT_SIZE } from "@constants/copilot";
import {
  compressContext,
  getPreservationCandidates,
  markMessagesWithAge,
  getMessagePriority,
} from "@services/reasoning/context-compression";
import { estimateTokens, createEntityTable } from "@services/reasoning/utils";

export interface AutoCompactionConfig {
  tokenLimit: number;
  compressAt: number;
  prioritizeFiles: boolean;
  prioritizeImages: boolean;
}

export interface CompactionResult {
  compacted: boolean;
  originalTokens: number;
  newTokens: number;
  tokensSaved: number;
  messagesCompressed: number;
  preservedContextFiles: number;
  preservedImages: number;
}

const DEFAULT_CONFIG: AutoCompactionConfig = {
  tokenLimit: DEFAULT_MAX_CONTEXT_TOKENS,
  compressAt: COMPACTION_TRIGGER_PERCENT,
  prioritizeFiles: true,
  prioritizeImages: true,
};

/**
 * Get compaction config for a specific model
 * Uses model's actual context window size
 */
export const getModelCompactionConfig = (
  modelId: string | undefined,
  overrides: Partial<AutoCompactionConfig> = {},
): AutoCompactionConfig => {
  const contextSize = modelId
    ? getModelContextSize(modelId)
    : DEFAULT_CONTEXT_SIZE;

  return {
    ...DEFAULT_CONFIG,
    tokenLimit: contextSize.input,
    ...overrides,
  };
};

const estimateMessageTokens = (message: Message): number => {
  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);
  const estimatedTokens = estimateTokens(content);
  return estimatedTokens;
};

const estimateTotalTokens = (messages: Message[]): number => {
  const messagesTokens = messages.reduce(
    (total, msg) => total + estimateMessageTokens(msg),
    0,
  );
  return messagesTokens;
};

const shouldCompact = (
  messages: Message[],
  config: AutoCompactionConfig = DEFAULT_CONFIG,
): boolean => {
  const totalTokens = estimateTotalTokens(messages);
  const threshold = config.tokenLimit * config.compressAt;
  return totalTokens >= threshold;
};

export interface CompactionCheckResult {
  needsCompaction: boolean;
  currentTokens: number;
  threshold: number;
  tokenLimit: number;
}

export const checkCompactionNeeded = (
  messages: Message[],
  config: AutoCompactionConfig = DEFAULT_CONFIG,
): CompactionCheckResult => {
  const currentTokens = estimateTotalTokens(messages);
  const threshold = config.tokenLimit * config.compressAt;
  return {
    needsCompaction: currentTokens >= threshold,
    currentTokens,
    threshold,
    tokenLimit: config.tokenLimit,
  };
};

const convertToCompressibleMessage = (
  message: Message,
  index: number,
  totalMessages: number,
  config: AutoCompactionConfig,
): CompressibleMessage => {
  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);

  const hasFileContent = content.includes("File:") && content.includes("```");
  const hasImageReference =
    content.includes("[image]") ||
    content.includes("data:image") ||
    /\.(png|jpg|jpeg|gif|webp|svg)/.test(content);

  return {
    id: `msg-${index}`,
    role: message.role as "user" | "assistant" | "tool" | "system",
    content,
    tokenCount: estimateTokens(content),
    age: totalMessages - index,
    isPreserved: false,
    isContextFile: config.prioritizeFiles && hasFileContent,
    isImage: config.prioritizeImages && hasImageReference,
  };
};

const convertToToolResult = (
  message: Message,
  index: number,
): CompressibleToolResult | null => {
  if (message.role !== "tool") {
    return null;
  }

  const content =
    typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);

  return {
    id: `tool-${index}`,
    toolName: "unknown",
    content,
    tokenCount: estimateTokens(content),
    success: !content.toLowerCase().includes("error"),
  };
};

const convertFromCompressibleMessage = (
  compressible: CompressibleMessage,
): Message => ({
  role: compressible.role,
  content: compressible.content,
});

export const compactConversation = (
  messages: Message[],
  config: AutoCompactionConfig = DEFAULT_CONFIG,
): { messages: Message[]; result: CompactionResult } => {
  const originalTokens = estimateTotalTokens(messages);
  const compactMessages = shouldCompact(messages, config);

  if (!compactMessages) {
    return {
      messages,
      result: {
        compacted: false,
        originalTokens,
        newTokens: originalTokens,
        tokensSaved: 0,
        messagesCompressed: 0,
        preservedContextFiles: 0,
        preservedImages: 0,
      },
    };
  }

  const compressibleMessages = messages.map((msg, idx) =>
    convertToCompressibleMessage(msg, idx, messages.length, config),
  );

  const toolResults = messages
    .map((msg, idx) => convertToToolResult(msg, idx))
    .filter(
      (toolResult): toolResult is CompressibleToolResult => toolResult !== null,
    );

  const preserveList = getPreservationCandidates(compressibleMessages);

  const agedMessages = markMessagesWithAge(
    compressibleMessages,
    messages.length,
  );

  const sortedByPriority = [...agedMessages].sort(
    (a, b) => getMessagePriority(b) - getMessagePriority(a),
  );

  const compressionOutput: CompressionOutput = compressContext({
    messages: sortedByPriority,
    toolResults,
    entities: createEntityTable([]),
    currentTokenCount: originalTokens,
    tokenLimit: config.tokenLimit,
    preserveList,
  });

  const outputMessages = compressionOutput.compressedMessages.map(
    convertFromCompressibleMessage,
  );

  const preservedContextFiles = compressionOutput.compressedMessages.filter(
    (m) => m.isContextFile,
  ).length;

  const preservedImages = compressionOutput.compressedMessages.filter(
    (m) => m.isImage,
  ).length;

  const newTokens = estimateTotalTokens(outputMessages);

  return {
    messages: outputMessages,
    result: {
      compacted: true,
      originalTokens,
      newTokens,
      tokensSaved: compressionOutput.tokensSaved,
      messagesCompressed: messages.length - outputMessages.length,
      preservedContextFiles,
      preservedImages,
    },
  };
};

export const createCompactionSummary = (result: CompactionResult): string => {
  if (!result.compacted) {
    return "";
  }

  const percentSaved = Math.round(
    (result.tokensSaved / result.originalTokens) * 100,
  );

  const parts = [
    `Compacted conversation: ${result.tokensSaved.toLocaleString()} tokens saved (${percentSaved}%)`,
  ];

  if (result.preservedContextFiles > 0) {
    parts.push(`${result.preservedContextFiles} context file(s) preserved`);
  }

  if (result.preservedImages > 0) {
    parts.push(`${result.preservedImages} image(s) preserved`);
  }

  return parts.join(" | ");
};

export const getCompactionConfig = (
  overrides: Partial<AutoCompactionConfig> = {},
): AutoCompactionConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
});
