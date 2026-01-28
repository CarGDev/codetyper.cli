/**
 * Memory Service
 *
 * Manages persistent memory across sessions.
 * Builds on the existing learning infrastructure.
 */

import {
  MEMORY_SYSTEM_PROMPT,
  MEMORY_CONTEXT_TEMPLATE,
  MEMORY_RETRIEVAL_PROMPT,
} from "@prompts/system/memory";
import {
  getLearnings,
  addLearning,
  buildLearningsContext,
} from "@services/project-config";
import type { LearningEntry } from "@/types/project-config";

export interface MemoryContext {
  isMemoryCommand: boolean;
  commandType: MemoryCommandType;
  content?: string;
  query?: string;
}

export type MemoryCommandType = "store" | "forget" | "query" | "list" | "none";

export type MemoryCategory =
  | "preference"
  | "convention"
  | "architecture"
  | "workflow"
  | "context"
  | "general";

interface MemoryMatch {
  memory: LearningEntry;
  relevance: number;
}

const STORE_PATTERNS = [
  /remember\s+(?:that\s+)?(.+)/i,
  /always\s+(.+)/i,
  /never\s+(.+)/i,
  /from now on[,]?\s+(.+)/i,
  /in this project[,]?\s+(.+)/i,
  /i (?:prefer|want|like)\s+(.+)/i,
  /use\s+(.+)\s+(?:for|when|instead)/i,
  /don't\s+(?:ever\s+)?(.+)/i,
  /make sure (?:to\s+)?(.+)/i,
];

const FORGET_PATTERNS = [
  /forget\s+(?:about\s+)?(.+)/i,
  /remove\s+(?:the\s+)?memory\s+(?:about\s+)?(.+)/i,
  /delete\s+(?:the\s+)?memory\s+(?:about\s+)?(.+)/i,
  /stop remembering\s+(.+)/i,
  /don't remember\s+(.+)/i,
];

const QUERY_PATTERNS = [
  /what do you (?:remember|know) about\s+(.+)/i,
  /do you remember\s+(.+)/i,
  /what (?:are|is) (?:my|the) (?:preference|convention)s?\s*(?:for\s+)?(.+)?/i,
  /show (?:me\s+)?(?:my\s+)?memories?\s*(?:about\s+)?(.+)?/i,
  /list (?:my\s+)?memories/i,
  /what have you learned/i,
];

const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  preference: ["prefer", "like", "want", "always", "never", "style", "format"],
  convention: ["convention", "pattern", "naming", "standard", "rule"],
  architecture: [
    "architecture",
    "structure",
    "design",
    "layer",
    "module",
    "component",
  ],
  workflow: ["workflow", "process", "deploy", "test", "build", "ci", "cd"],
  context: ["context", "background", "project", "about", "note"],
  general: [],
};

/**
 * Detect if input is a memory-related command
 */
export const detectMemoryCommand = (input: string): MemoryContext => {
  const lowerInput = input.toLowerCase();

  // Check for store commands
  for (const pattern of STORE_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return {
        isMemoryCommand: true,
        commandType: "store",
        content: match[1]?.trim(),
      };
    }
  }

  // Check for forget commands
  for (const pattern of FORGET_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return {
        isMemoryCommand: true,
        commandType: "forget",
        query: match[1]?.trim(),
      };
    }
  }

  // Check for query commands
  for (const pattern of QUERY_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      const isListCommand = /list|show.*memories|what have you learned/i.test(
        lowerInput,
      );
      return {
        isMemoryCommand: true,
        commandType: isListCommand ? "list" : "query",
        query: match[1]?.trim(),
      };
    }
  }

  return {
    isMemoryCommand: false,
    commandType: "none",
  };
};

/**
 * Detect category from content
 */
export const detectCategory = (content: string): MemoryCategory => {
  const lowerContent = content.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "general") continue;
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        return category as MemoryCategory;
      }
    }
  }

  return "general";
};

/**
 * Calculate relevance score between memory and query
 */
const calculateRelevance = (memory: LearningEntry, query: string): number => {
  const lowerContent = memory.content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 2);

  let score = 0;

  // Exact substring match
  if (lowerContent.includes(lowerQuery)) {
    score += 10;
  }

  // Word overlap
  for (const word of queryWords) {
    if (lowerContent.includes(word)) {
      score += 2;
    }
  }

  // Context match
  if (memory.context) {
    const lowerContext = memory.context.toLowerCase();
    if (lowerContext.includes(lowerQuery)) {
      score += 5;
    }
    for (const word of queryWords) {
      if (lowerContext.includes(word)) {
        score += 1;
      }
    }
  }

  // Recency bonus (newer memories slightly preferred)
  const ageInDays = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24);
  if (ageInDays < 7) {
    score += 1;
  }

  return score;
};

/**
 * Store a new memory
 */
export const storeMemory = async (
  content: string,
  context?: string,
  global = false,
): Promise<void> => {
  await addLearning(content, context, global);
};

/**
 * Get all memories
 */
export const getMemories = async (): Promise<LearningEntry[]> => {
  return getLearnings();
};

/**
 * Find memories matching a query
 */
export const findMemories = async (query: string): Promise<LearningEntry[]> => {
  const memories = await getMemories();

  if (!query || query.trim() === "") {
    return memories.slice(0, 10);
  }

  const matches: MemoryMatch[] = memories.map((memory) => ({
    memory,
    relevance: calculateRelevance(memory, query),
  }));

  return matches
    .filter((m) => m.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10)
    .map((m) => m.memory);
};

/**
 * Get relevant memories for a user input (auto-retrieval)
 */
export const getRelevantMemories = async (
  userInput: string,
): Promise<LearningEntry[]> => {
  const memories = await getMemories();

  if (memories.length === 0) {
    return [];
  }

  // Extract key terms from user input
  const keyTerms = userInput
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 10);

  if (keyTerms.length === 0) {
    return [];
  }

  const matches: MemoryMatch[] = memories.map((memory) => ({
    memory,
    relevance: calculateRelevance(memory, keyTerms.join(" ")),
  }));

  // Only return memories with meaningful relevance
  return matches
    .filter((m) => m.relevance >= 3)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)
    .map((m) => m.memory);
};

/**
 * Build memory context for system prompt
 */
export const buildMemoryContext = async (): Promise<string> => {
  const context = await buildLearningsContext();
  if (!context) {
    return "";
  }

  return MEMORY_CONTEXT_TEMPLATE.replace("{{memories}}", context);
};

/**
 * Build relevant memory prompt for a user message
 */
export const buildRelevantMemoryPrompt = async (
  userInput: string,
): Promise<string> => {
  const relevant = await getRelevantMemories(userInput);

  if (relevant.length === 0) {
    return "";
  }

  const memoryList = relevant.map((m) => `- ${m.content}`).join("\n");

  return MEMORY_RETRIEVAL_PROMPT.replace("{{relevantMemories}}", memoryList);
};

/**
 * Get memory system prompt
 */
export const getMemoryPrompt = (): string => {
  return MEMORY_SYSTEM_PROMPT;
};

/**
 * Format memories for display
 */
export const formatMemoriesForDisplay = (memories: LearningEntry[]): string => {
  if (memories.length === 0) {
    return "No memories stored yet.";
  }

  return memories
    .map((m, i) => {
      const date = new Date(m.createdAt).toLocaleDateString();
      const context = m.context ? ` (${m.context})` : "";
      return `${i + 1}. ${m.content}${context} - ${date}`;
    })
    .join("\n");
};

/**
 * Process memory command and return response
 */
export const processMemoryCommand = async (
  context: MemoryContext,
): Promise<{ success: boolean; message: string }> => {
  const handlers: Record<
    MemoryCommandType,
    () => Promise<{ success: boolean; message: string }>
  > = {
    store: async () => {
      if (!context.content) {
        return { success: false, message: "No content to remember." };
      }
      const category = detectCategory(context.content);
      await storeMemory(context.content, category);
      return {
        success: true,
        message: `Remembered: "${context.content}" (category: ${category})`,
      };
    },

    forget: async () => {
      // Note: Full forget implementation would need deletion support
      return {
        success: false,
        message:
          "Forget functionality not yet implemented. Memories can be manually removed from .codetyper/learnings/",
      };
    },

    query: async () => {
      const memories = await findMemories(context.query || "");
      if (memories.length === 0) {
        return {
          success: true,
          message: `No memories found${context.query ? ` about "${context.query}"` : ""}.`,
        };
      }
      return {
        success: true,
        message: `Found ${memories.length} memories:\n${formatMemoriesForDisplay(memories)}`,
      };
    },

    list: async () => {
      const memories = await getMemories();
      return {
        success: true,
        message: `All memories (${memories.length}):\n${formatMemoriesForDisplay(memories)}`,
      };
    },

    none: async () => {
      return { success: false, message: "Not a memory command." };
    },
  };

  return handlers[context.commandType]();
};
