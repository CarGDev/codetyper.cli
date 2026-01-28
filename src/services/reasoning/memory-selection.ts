/**
 * Memory Relevance Selection Layer
 * Selects which stored memories to include based on computable relevance signals
 */

import type {
  MemoryItem,
  MemoryItemType,
  MemoryId,
  QueryContext,
  RelevanceScore,
  RelevanceBreakdown,
  SelectionInput,
  SelectionOutput,
  ExclusionReason,
  Entity,
} from "@/types/reasoning";

import {
  MEMORY_WEIGHTS,
  RECENCY_HALF_LIFE_MINUTES,
  RELEVANCE_THRESHOLD,
  MEMORY_TYPE_BONUSES,
  MANDATORY_MEMORY_AGE_THRESHOLD,
  ERROR_MEMORY_AGE_THRESHOLD,
} from "@constants/reasoning";

import {
  jaccardSimilarity,
  recencyDecay,
  estimateTokens,
  tokenize,
  createTimestamp,
} from "@services/reasoning/utils";

// =============================================================================
// MAIN SELECTION FUNCTION
// =============================================================================

export function selectRelevantMemories(input: SelectionInput): SelectionOutput {
  const { memories, query, tokenBudget, mandatoryItems } = input;

  const scored = scoreAllMemories(memories, query);
  const sortedByRelevance = sortByRelevance(scored);
  const deduped = deduplicateMemories(sortedByRelevance);

  const selection = buildSelection(deduped, mandatoryItems, tokenBudget);

  return selection;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

interface ScoredMemory {
  item: MemoryItem;
  score: RelevanceScore;
}

function scoreAllMemories(
  memories: MemoryItem[],
  query: QueryContext,
): ScoredMemory[] {
  return memories.map((item) => ({
    item,
    score: computeRelevance(item, query),
  }));
}

export function computeRelevance(
  item: MemoryItem,
  query: QueryContext,
): RelevanceScore {
  const breakdown = computeRelevanceBreakdown(item, query);
  const total = computeTotalScore(breakdown);

  return { total, breakdown };
}

function computeRelevanceBreakdown(
  item: MemoryItem,
  query: QueryContext,
): RelevanceBreakdown {
  return {
    keywordOverlap: computeKeywordOverlap(item.tokens, query.tokens),
    entityOverlap: computeEntityOverlap(item.entities, query.entities),
    recency: computeRecencyScore(item.timestamp, query.timestamp),
    causalLink: computeCausalLinkScore(item, query.activeItems),
    pathOverlap: computePathOverlap(item.filePaths, query.activePaths),
    typeBonus: computeTypeBonus(item.type),
  };
}

function computeTotalScore(breakdown: RelevanceBreakdown): number {
  return (
    breakdown.keywordOverlap * MEMORY_WEIGHTS.keywordOverlap +
    breakdown.entityOverlap * MEMORY_WEIGHTS.entityOverlap +
    breakdown.recency * MEMORY_WEIGHTS.recency +
    breakdown.causalLink * MEMORY_WEIGHTS.causalLink +
    breakdown.pathOverlap * MEMORY_WEIGHTS.pathOverlap +
    breakdown.typeBonus * MEMORY_WEIGHTS.typeBonus
  );
}

// =============================================================================
// INDIVIDUAL SCORE COMPONENTS
// =============================================================================

function computeKeywordOverlap(
  itemTokens: string[],
  queryTokens: string[],
): number {
  return jaccardSimilarity(itemTokens, queryTokens);
}

function computeEntityOverlap(
  itemEntities: Entity[],
  queryEntities: Entity[],
): number {
  if (itemEntities.length === 0 || queryEntities.length === 0) {
    return 0;
  }

  const itemSet = new Set(
    itemEntities.map((e) => `${e.type}:${e.value.toLowerCase()}`),
  );
  const querySet = new Set(
    queryEntities.map((e) => `${e.type}:${e.value.toLowerCase()}`),
  );

  const intersection = [...itemSet].filter((e) => querySet.has(e)).length;
  const union = new Set([...itemSet, ...querySet]).size;

  return union > 0 ? intersection / union : 0;
}

function computeRecencyScore(itemTime: number, queryTime: number): number {
  return recencyDecay(itemTime, queryTime, RECENCY_HALF_LIFE_MINUTES);
}

function computeCausalLinkScore(
  item: MemoryItem,
  activeItems: MemoryId[],
): number {
  if (item.causalLinks.length === 0) {
    return 0;
  }

  const hasLink = item.causalLinks.some((link) => activeItems.includes(link));
  return hasLink ? 1.0 : 0.0;
}

function computePathOverlap(
  itemPaths: string[] | undefined,
  activePaths: string[],
): number {
  if (!itemPaths || itemPaths.length === 0 || activePaths.length === 0) {
    return 0;
  }

  const normalizedItemPaths = itemPaths.map(normalizePath);
  const normalizedActivePaths = activePaths.map(normalizePath);

  let matchCount = 0;

  for (const itemPath of normalizedItemPaths) {
    for (const activePath of normalizedActivePaths) {
      if (pathsMatch(itemPath, activePath)) {
        matchCount++;
        break;
      }
    }
  }

  return matchCount / itemPaths.length;
}

function normalizePath(path: string): string {
  return path.toLowerCase().replace(/\\/g, "/");
}

function pathsMatch(pathA: string, pathB: string): boolean {
  if (pathA === pathB) return true;
  if (pathA.includes(pathB) || pathB.includes(pathA)) return true;

  const partsA = pathA.split("/");
  const partsB = pathB.split("/");
  const fileA = partsA[partsA.length - 1];
  const fileB = partsB[partsB.length - 1];

  return fileA === fileB;
}

function computeTypeBonus(type: MemoryItemType): number {
  return MEMORY_TYPE_BONUSES[type] || 0;
}

// =============================================================================
// SORTING AND DEDUPLICATION
// =============================================================================

function sortByRelevance(scored: ScoredMemory[]): ScoredMemory[] {
  return [...scored].sort((a, b) => b.score.total - a.score.total);
}

function deduplicateMemories(scored: ScoredMemory[]): ScoredMemory[] {
  const seen = new Set<string>();
  const result: ScoredMemory[] = [];

  for (const item of scored) {
    const contentHash = hashContent(item.item.content);

    if (!seen.has(contentHash)) {
      seen.add(contentHash);
      result.push(item);
    }
  }

  return result;
}

function hashContent(content: string): string {
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return hash.toString(36);
}

// =============================================================================
// SELECTION BUILDING
// =============================================================================

function buildSelection(
  scored: ScoredMemory[],
  mandatoryItems: MemoryId[],
  tokenBudget: number,
): SelectionOutput {
  const selected: MemoryItem[] = [];
  const scores = new Map<MemoryId, RelevanceScore>();
  const excluded: Array<{ id: MemoryId; reason: ExclusionReason }> = [];
  let tokenUsage = 0;

  const mandatorySet = new Set(mandatoryItems);

  for (const { item, score } of scored) {
    if (mandatorySet.has(item.id)) {
      selected.push(item);
      scores.set(item.id, score);
      tokenUsage += item.tokenCount;
      mandatorySet.delete(item.id);
    }
  }

  for (const { item, score } of scored) {
    if (selected.some((s) => s.id === item.id)) {
      continue;
    }

    if (score.total < RELEVANCE_THRESHOLD) {
      excluded.push({ id: item.id, reason: "LOW_RELEVANCE" });
      continue;
    }

    if (tokenUsage + item.tokenCount > tokenBudget) {
      excluded.push({ id: item.id, reason: "TOKEN_BUDGET_EXCEEDED" });
      continue;
    }

    selected.push(item);
    scores.set(item.id, score);
    tokenUsage += item.tokenCount;
  }

  return {
    selected,
    scores,
    tokenUsage,
    excluded,
  };
}

// =============================================================================
// MANDATORY INCLUSION RULES
// =============================================================================

export function computeMandatoryItems(
  memories: MemoryItem[],
  currentTimestamp: number,
): MemoryId[] {
  const mandatory: MemoryId[] = [];

  const recentMemories = memories
    .filter((m) => {
      const ageMinutes = (currentTimestamp - m.timestamp) / 60000;
      return ageMinutes <= MANDATORY_MEMORY_AGE_THRESHOLD;
    })
    .map((m) => m.id);

  mandatory.push(...recentMemories);

  const recentErrors = memories
    .filter((m) => {
      const ageMinutes = (currentTimestamp - m.timestamp) / 60000;
      return m.type === "ERROR" && ageMinutes <= ERROR_MEMORY_AGE_THRESHOLD;
    })
    .map((m) => m.id);

  mandatory.push(...recentErrors);

  const decisions = memories
    .filter((m) => m.type === "DECISION")
    .slice(-3)
    .map((m) => m.id);

  mandatory.push(...decisions);

  return [...new Set(mandatory)];
}

// =============================================================================
// MEMORY ITEM CREATION
// =============================================================================

export function createMemoryItem(
  content: string,
  type: MemoryItemType,
  options: {
    filePaths?: string[];
    causalLinks?: MemoryId[];
  } = {},
): MemoryItem {
  const tokens = tokenize(content);
  const entities: Entity[] = [];

  const id = `mem_${createTimestamp()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    content,
    tokens,
    entities,
    timestamp: createTimestamp(),
    type,
    causalLinks: options.causalLinks || [],
    tokenCount: estimateTokens(content),
    filePaths: options.filePaths,
  };
}

export function createQueryContext(
  queryText: string,
  options: {
    activeItems?: MemoryId[];
    activePaths?: string[];
  } = {},
): QueryContext {
  const tokens = tokenize(queryText);
  const entities: Entity[] = [];

  return {
    tokens,
    entities,
    timestamp: createTimestamp(),
    activeItems: options.activeItems || [],
    activePaths: options.activePaths || [],
  };
}

// =============================================================================
// MEMORY STORE OPERATIONS
// =============================================================================

export interface MemoryStore {
  items: MemoryItem[];
  maxItems: number;
}

export function createMemoryStore(maxItems: number = 1000): MemoryStore {
  return {
    items: [],
    maxItems,
  };
}

export function addMemory(store: MemoryStore, item: MemoryItem): MemoryStore {
  const newItems = [...store.items, item];

  if (newItems.length > store.maxItems) {
    const sorted = [...newItems].sort((a, b) => {
      const aScore =
        MEMORY_TYPE_BONUSES[a.type] + (Date.now() - a.timestamp) / -3600000;
      const bScore =
        MEMORY_TYPE_BONUSES[b.type] + (Date.now() - b.timestamp) / -3600000;
      return bScore - aScore;
    });

    return {
      ...store,
      items: sorted.slice(0, store.maxItems),
    };
  }

  return {
    ...store,
    items: newItems,
  };
}

export function findMemoriesByType(
  store: MemoryStore,
  type: MemoryItemType,
): MemoryItem[] {
  return store.items.filter((m) => m.type === type);
}

export function findMemoriesByPath(
  store: MemoryStore,
  path: string,
): MemoryItem[] {
  const normalizedPath = normalizePath(path);

  return store.items.filter((m) =>
    m.filePaths?.some((p) => normalizePath(p).includes(normalizedPath)),
  );
}

export function pruneOldMemories(
  store: MemoryStore,
  maxAgeMs: number,
): MemoryStore {
  const cutoff = createTimestamp() - maxAgeMs;

  return {
    ...store,
    items: store.items.filter((m) => m.timestamp >= cutoff),
  };
}
