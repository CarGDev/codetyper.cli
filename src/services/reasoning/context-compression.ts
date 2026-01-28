/**
 * Context Compression Layer
 * Reduces context window usage through deterministic transformations
 */

import type {
  CompressionLevel,
  CompressionTrigger,
  CompressionInput,
  CompressionOutput,
  CompressibleMessage,
  CompressibleToolResult,
  CodeBlock,
  Entity,
  MessageId,
} from "@/types/reasoning";

import {
  COMPRESSION_THRESHOLDS,
  COMPRESSION_LIMITS,
  PRESERVATION_PRIORITIES,
} from "@constants/reasoning";

import {
  estimateTokens,
  truncateMiddle,
  foldCode,
  extractCodeBlocks,
  extractEntities,
  createEntityTable,
  generateId,
} from "@services/reasoning/utils";

// =============================================================================
// COMPRESSION STATE MACHINE
// =============================================================================

export function determineCompressionLevel(
  currentTokenCount: number,
  tokenLimit: number,
): CompressionLevel {
  const usage = currentTokenCount / tokenLimit;

  if (usage >= COMPRESSION_THRESHOLDS.MINIMAL_AT) {
    return "MINIMAL";
  }

  if (usage >= COMPRESSION_THRESHOLDS.COMPRESS_AT) {
    return "COMPRESSED";
  }

  return "FULL";
}

export function shouldCompress(trigger: CompressionTrigger): boolean {
  if (trigger.event === "EXPLICIT_COMPRESSION_REQUEST") {
    return true;
  }

  if (trigger.event === "RETRY_POLICY_REQUEST") {
    return true;
  }

  if (trigger.event === "TOKEN_THRESHOLD_EXCEEDED") {
    const usage = trigger.usage / trigger.limit;
    return usage >= COMPRESSION_THRESHOLDS.COMPRESS_AT;
  }

  return false;
}

// =============================================================================
// MAIN COMPRESSION FUNCTION
// =============================================================================

export function compressContext(input: CompressionInput): CompressionOutput {
  const targetLevel = determineCompressionLevel(
    input.currentTokenCount,
    input.tokenLimit,
  );

  if (targetLevel === "FULL") {
    return createNoCompressionOutput(input);
  }

  const rules = selectCompressionRules(targetLevel);
  const result = applyCompressionRules(input, rules);

  return result;
}

function createNoCompressionOutput(input: CompressionInput): CompressionOutput {
  return {
    compressedMessages: input.messages,
    entityTable: input.entities,
    tokensSaved: 0,
    compressionRatio: 1,
    appliedRules: [],
  };
}

// =============================================================================
// COMPRESSION RULES
// =============================================================================

interface CompressionRule {
  id: string;
  priority: number;
  applicableTo: "MESSAGE" | "TOOL_RESULT" | "CODE_BLOCK";
  condition: (
    item: CompressibleMessage | CompressibleToolResult | CodeBlock,
  ) => boolean;
  transform: (
    item: CompressibleMessage | CompressibleToolResult | CodeBlock,
  ) => CompressibleMessage | null;
  estimatedReduction: number;
}

function selectCompressionRules(level: CompressionLevel): CompressionRule[] {
  const allRules: CompressionRule[] = [
    createTruncateLargeToolResultsRule(),
    createFoldCodeBlocksRule(),
    createRemoveRedundantMessagesRule(),
    createExtractEntitiesFromOldMessagesRule(),
    createCollapseFailedAttemptsRule(),
  ];

  if (level === "MINIMAL") {
    return allRules;
  }

  return allRules.filter((r) => r.priority <= 3);
}

function createTruncateLargeToolResultsRule(): CompressionRule {
  return {
    id: "TRUNCATE_LARGE_TOOL_RESULTS",
    priority: 1,
    applicableTo: "TOOL_RESULT",
    condition: (item) => {
      const toolResult = item as CompressibleToolResult;
      return toolResult.tokenCount > COMPRESSION_LIMITS.maxToolResultTokens;
    },
    transform: (item) => {
      const toolResult = item as CompressibleToolResult;
      const truncated = truncateMiddle(
        toolResult.content,
        COMPRESSION_LIMITS.truncateHeadTokens * 4,
        COMPRESSION_LIMITS.truncateTailTokens * 4,
      );

      return {
        id: toolResult.id,
        role: "tool" as const,
        content: truncated,
        tokenCount: estimateTokens(truncated),
        age: 0,
        isPreserved: false,
        metadata: { toolCallId: toolResult.id },
      };
    },
    estimatedReduction: 0.6,
  };
}

function createFoldCodeBlocksRule(): CompressionRule {
  return {
    id: "FOLD_CODE_BLOCKS",
    priority: 2,
    applicableTo: "CODE_BLOCK",
    condition: (item) => {
      const codeBlock = item as CodeBlock;
      return codeBlock.lineCount > COMPRESSION_LIMITS.maxCodeBlockLines;
    },
    transform: (item) => {
      const codeBlock = item as CodeBlock;
      const folded = foldCode(codeBlock.content, {
        keepLines: COMPRESSION_LIMITS.keepCodeHeadLines,
        tailLines: COMPRESSION_LIMITS.keepCodeTailLines,
      });

      return {
        id: codeBlock.sourceMessageId,
        role: "assistant" as const,
        content: `\`\`\`${codeBlock.language}\n${folded}\n\`\`\``,
        tokenCount: estimateTokens(folded),
        age: 0,
        isPreserved: false,
        metadata: { containsCode: true },
      };
    },
    estimatedReduction: 0.5,
  };
}

function createRemoveRedundantMessagesRule(): CompressionRule {
  return {
    id: "REMOVE_REDUNDANT_MESSAGES",
    priority: 3,
    applicableTo: "MESSAGE",
    condition: (item) => {
      const message = item as CompressibleMessage;
      return (
        message.role === "assistant" && message.metadata?.isSuperseded === true
      );
    },
    transform: () => null,
    estimatedReduction: 1.0,
  };
}

function createExtractEntitiesFromOldMessagesRule(): CompressionRule {
  return {
    id: "EXTRACT_ENTITIES_FROM_OLD_MESSAGES",
    priority: 4,
    applicableTo: "MESSAGE",
    condition: (item) => {
      const message = item as CompressibleMessage;
      return (
        message.age > COMPRESSION_LIMITS.maxMessageAge && !message.isPreserved
      );
    },
    transform: (item) => {
      const message = item as CompressibleMessage;
      const entities = extractEntities(message.content, message.id);
      const entitySummary = entities
        .map((e) => `${e.type}:${e.value}`)
        .join(", ");

      return {
        id: message.id,
        role: message.role,
        content: `[Message ${message.id}: mentioned ${entities.length} entities: ${entitySummary}]`,
        tokenCount: estimateTokens(entitySummary) + 20,
        age: message.age,
        isPreserved: false,
        metadata: { ...message.metadata },
      };
    },
    estimatedReduction: 0.8,
  };
}

function createCollapseFailedAttemptsRule(): CompressionRule {
  return {
    id: "COLLAPSE_FAILED_ATTEMPTS",
    priority: 5,
    applicableTo: "MESSAGE",
    condition: (item) => {
      const message = item as CompressibleMessage;
      return message.metadata?.attemptFailed === true;
    },
    transform: (item) => {
      const message = item as CompressibleMessage;
      const reason = message.metadata?.failureReason || "unknown";

      return {
        id: message.id,
        role: message.role,
        content: `[Failed attempt: ${reason}]`,
        tokenCount: estimateTokens(reason) + 20,
        age: message.age,
        isPreserved: false,
        metadata: { ...message.metadata },
      };
    },
    estimatedReduction: 0.9,
  };
}

// =============================================================================
// RULE APPLICATION
// =============================================================================

function applyCompressionRules(
  input: CompressionInput,
  rules: CompressionRule[],
): CompressionOutput {
  let compressedMessages = [...input.messages];
  let totalTokensSaved = 0;
  const appliedRules: string[] = [];
  let extractedEntities: Entity[] = [...input.entities.entities];

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (rule.applicableTo === "MESSAGE") {
      const result = applyMessageRule(
        compressedMessages,
        rule,
        input.preserveList,
      );
      compressedMessages = result.messages;
      totalTokensSaved += result.tokensSaved;
      extractedEntities = [...extractedEntities, ...result.extractedEntities];

      if (result.applied) {
        appliedRules.push(rule.id);
      }
    }

    if (rule.applicableTo === "TOOL_RESULT") {
      const result = applyToolResultRule(input.toolResults, rule);
      const toolResultMessages = result.messages;

      for (const trMsg of toolResultMessages) {
        const existingIdx = compressedMessages.findIndex(
          (m) => m.metadata?.toolCallId === trMsg.metadata?.toolCallId,
        );
        if (existingIdx >= 0) {
          const oldTokens = compressedMessages[existingIdx].tokenCount;
          compressedMessages[existingIdx] = trMsg;
          totalTokensSaved += oldTokens - trMsg.tokenCount;
        }
      }

      if (result.applied) {
        appliedRules.push(rule.id);
      }
    }

    if (rule.applicableTo === "CODE_BLOCK") {
      const result = applyCodeBlockRule(compressedMessages, rule);
      compressedMessages = result.messages;
      totalTokensSaved += result.tokensSaved;

      if (result.applied) {
        appliedRules.push(rule.id);
      }
    }
  }

  const originalTokenCount = input.currentTokenCount;
  const newTokenCount = originalTokenCount - totalTokensSaved;
  const compressionRatio = newTokenCount / originalTokenCount;

  return {
    compressedMessages,
    entityTable: createEntityTable(extractedEntities),
    tokensSaved: totalTokensSaved,
    compressionRatio,
    appliedRules,
  };
}

interface MessageRuleResult {
  messages: CompressibleMessage[];
  tokensSaved: number;
  extractedEntities: Entity[];
  applied: boolean;
}

function applyMessageRule(
  messages: CompressibleMessage[],
  rule: CompressionRule,
  preserveList: MessageId[],
): MessageRuleResult {
  const result: CompressibleMessage[] = [];
  let tokensSaved = 0;
  const extractedEntities: Entity[] = [];
  let applied = false;

  for (const message of messages) {
    if (preserveList.includes(message.id)) {
      result.push(message);
      continue;
    }

    if (rule.condition(message)) {
      applied = true;
      const transformed = rule.transform(message);

      if (transformed === null) {
        tokensSaved += message.tokenCount;
      } else {
        const saved = message.tokenCount - transformed.tokenCount;
        tokensSaved += Math.max(0, saved);
        result.push(transformed);

        const entities = extractEntities(message.content, message.id);
        extractedEntities.push(...entities);
      }
    } else {
      result.push(message);
    }
  }

  return { messages: result, tokensSaved, extractedEntities, applied };
}

interface ToolResultRuleResult {
  messages: CompressibleMessage[];
  applied: boolean;
}

function applyToolResultRule(
  toolResults: CompressibleToolResult[],
  rule: CompressionRule,
): ToolResultRuleResult {
  const messages: CompressibleMessage[] = [];
  let applied = false;

  for (const toolResult of toolResults) {
    if (rule.condition(toolResult)) {
      applied = true;
      const transformed = rule.transform(toolResult);
      if (transformed) {
        messages.push(transformed);
      }
    }
  }

  return { messages, applied };
}

interface CodeBlockRuleResult {
  messages: CompressibleMessage[];
  tokensSaved: number;
  applied: boolean;
}

function applyCodeBlockRule(
  messages: CompressibleMessage[],
  rule: CompressionRule,
): CodeBlockRuleResult {
  const result: CompressibleMessage[] = [];
  let tokensSaved = 0;
  let applied = false;

  for (const message of messages) {
    const codeBlocks = extractCodeBlocks(message.content);

    if (codeBlocks.length === 0) {
      result.push(message);
      continue;
    }

    let modifiedContent = message.content;
    let contentTokensSaved = 0;

    for (const block of codeBlocks) {
      const codeBlockObj: CodeBlock = {
        id: generateId("codeblock"),
        language: block.language,
        content: block.content,
        lineCount: block.content.split("\n").length,
        sourceMessageId: message.id,
      };

      if (rule.condition(codeBlockObj)) {
        applied = true;
        const folded = foldCode(block.content, {
          keepLines: COMPRESSION_LIMITS.keepCodeHeadLines,
          tailLines: COMPRESSION_LIMITS.keepCodeTailLines,
        });

        const originalBlock = `\`\`\`${block.language}\n${block.content}\`\`\``;
        const foldedBlock = `\`\`\`${block.language}\n${folded}\`\`\``;

        modifiedContent = modifiedContent.replace(originalBlock, foldedBlock);
        contentTokensSaved +=
          estimateTokens(block.content) - estimateTokens(folded);
      }
    }

    result.push({
      ...message,
      content: modifiedContent,
      tokenCount: message.tokenCount - contentTokensSaved,
    });

    tokensSaved += contentTokensSaved;
  }

  return { messages: result, tokensSaved, applied };
}

// =============================================================================
// INCREMENTAL COMPRESSION
// =============================================================================

export function compressIncrementally(
  messages: CompressibleMessage[],
  targetTokenReduction: number,
): { messages: CompressibleMessage[]; actualReduction: number } {
  let currentMessages = [...messages];
  let totalReduction = 0;

  const rules = selectCompressionRules("MINIMAL");

  for (const rule of rules) {
    if (totalReduction >= targetTokenReduction) {
      break;
    }

    if (rule.applicableTo === "MESSAGE") {
      const result = applyMessageRule(currentMessages, rule, []);
      currentMessages = result.messages;
      totalReduction += result.tokensSaved;
    }
  }

  return {
    messages: currentMessages,
    actualReduction: totalReduction,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function calculateMessageAge(
  _messageTimestamp: number,
  currentTurnNumber: number,
  messageTurnNumber: number,
): number {
  return currentTurnNumber - messageTurnNumber;
}

export function markMessagesWithAge(
  messages: CompressibleMessage[],
  currentTurnNumber: number,
): CompressibleMessage[] {
  return messages.map((msg, idx) => ({
    ...msg,
    age: currentTurnNumber - idx,
  }));
}

export function getPreservationCandidates(
  messages: CompressibleMessage[],
): MessageId[] {
  const contextFiles = messages
    .filter((m) => m.isContextFile === true)
    .map((m) => m.id);

  const images = messages.filter((m) => m.isImage === true).map((m) => m.id);

  const recent = messages
    .slice(-COMPRESSION_LIMITS.preserveRecentMessages)
    .map((m) => m.id);

  const withErrors = messages
    .filter((m) => m.content.toLowerCase().includes("error"))
    .map((m) => m.id);

  return [...new Set([...contextFiles, ...images, ...recent, ...withErrors])];
}

export function getMessagePriority(message: CompressibleMessage): number {
  if (message.isContextFile) {
    return PRESERVATION_PRIORITIES.CONTEXT_FILE;
  }
  if (message.isImage) {
    return PRESERVATION_PRIORITIES.IMAGE;
  }
  if (message.content.toLowerCase().includes("error")) {
    return PRESERVATION_PRIORITIES.ERROR;
  }
  if (message.age <= COMPRESSION_LIMITS.preserveRecentMessages) {
    return PRESERVATION_PRIORITIES.RECENT_MESSAGE;
  }
  if (message.role === "tool") {
    return PRESERVATION_PRIORITIES.TOOL_RESULT;
  }
  return PRESERVATION_PRIORITIES.OLD_MESSAGE;
}

export function shouldPreserveMessage(message: CompressibleMessage): boolean {
  const priority = getMessagePriority(message);
  return priority >= PRESERVATION_PRIORITIES.RECENT_MESSAGE;
}
