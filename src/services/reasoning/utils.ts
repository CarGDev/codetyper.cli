/**
 * Utility functions for the Reasoning Control Layer
 * Pure functions for common operations
 */

import type { Entity, EntityType, EntityTable } from "@/types/reasoning";
import {
  ENTITY_PATTERNS,
  TOKENS_PER_CHAR_ESTIMATE,
} from "@constants/reasoning";

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

export function estimateTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR_ESTIMATE);
}

export function estimateTokensForObject(obj: unknown): number {
  return estimateTokens(JSON.stringify(obj));
}

// =============================================================================
// TOKENIZATION
// =============================================================================

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "and",
  "but",
  "if",
  "or",
  "because",
  "until",
  "while",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "this",
  "that",
  "am",
  "been",
  "being",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

// =============================================================================
// SIMILARITY FUNCTIONS
// =============================================================================

export function jaccardSimilarity(setA: string[], setB: string[]): number {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

export function weightedSum(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    throw new Error("Values and weights must have same length");
  }
  return values.reduce((sum, val, i) => sum + val * weights[i], 0);
}

// =============================================================================
// ENTITY EXTRACTION
// =============================================================================

export function extractEntities(
  text: string,
  sourceMessageId: string,
): Entity[] {
  const entities: Entity[] = [];
  const seen = new Set<string>();

  for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const value = match[1] || match[0];
      const key = `${type}:${value}`;

      if (!seen.has(key)) {
        seen.add(key);
        entities.push({
          type: type as EntityType,
          value: value.trim(),
          sourceMessageId,
          frequency: 1,
        });
      }
    }
  }

  return entities;
}

export function createEntityTable(entities: Entity[]): EntityTable {
  const byType: Record<EntityType, Entity[]> = {
    FILE: [],
    FUNCTION: [],
    VARIABLE: [],
    CLASS: [],
    URL: [],
    ERROR_CODE: [],
  };

  const bySource: Record<string, Entity[]> = {};

  for (const entity of entities) {
    byType[entity.type].push(entity);

    if (!bySource[entity.sourceMessageId]) {
      bySource[entity.sourceMessageId] = [];
    }
    bySource[entity.sourceMessageId].push(entity);
  }

  return { entities, byType, bySource };
}

export function mergeEntityTables(a: EntityTable, b: EntityTable): EntityTable {
  const merged = [...a.entities, ...b.entities];
  return createEntityTable(merged);
}

// =============================================================================
// TEXT PROCESSING
// =============================================================================

export function truncateMiddle(
  text: string,
  keepHead: number,
  keepTail: number,
): string {
  const totalKeep = keepHead + keepTail;
  if (text.length <= totalKeep) {
    return text;
  }

  const head = text.slice(0, keepHead);
  const tail = text.slice(-keepTail);
  const removed = text.length - totalKeep;

  return `${head}\n\n... [${removed} characters truncated] ...\n\n${tail}`;
}

export function foldCode(
  code: string,
  options: { keepLines: number; tailLines: number },
): string {
  const lines = code.split("\n");
  const totalLines = lines.length;

  if (totalLines <= options.keepLines + options.tailLines) {
    return code;
  }

  const head = lines.slice(0, options.keepLines);
  const tail = lines.slice(-options.tailLines);
  const folded = totalLines - options.keepLines - options.tailLines;

  return [...head, `// ... [${folded} lines folded] ...`, ...tail].join("\n");
}

export function extractCodeBlocks(text: string): Array<{
  language: string;
  content: string;
  startIndex: number;
  endIndex: number;
}> {
  const blocks: Array<{
    language: string;
    content: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || "unknown",
      content: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return blocks;
}

// =============================================================================
// TIME UTILITIES
// =============================================================================

export function recencyDecay(
  itemTime: number,
  queryTime: number,
  halfLifeMinutes: number,
): number {
  const ageMs = queryTime - itemTime;
  const ageMinutes = ageMs / 60000;
  return Math.pow(0.5, ageMinutes / halfLifeMinutes);
}

export function createTimestamp(): number {
  return Date.now();
}

// =============================================================================
// ID GENERATION
// =============================================================================

export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function hasBalancedBraces(text: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = {
    "(": ")",
    "[": "]",
    "{": "}",
  };

  for (const char of text) {
    if (char in pairs) {
      stack.push(pairs[char]);
    } else if (Object.values(pairs).includes(char)) {
      if (stack.pop() !== char) {
        return false;
      }
    }
  }

  return stack.length === 0;
}

export function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(
    new RegExp(pattern.source, "g" + (pattern.flags.includes("i") ? "i" : "")),
  );
  return matches ? matches.length : 0;
}

// =============================================================================
// ARRAY UTILITIES
// =============================================================================

export function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
