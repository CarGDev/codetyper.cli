/**
 * Result Aggregator
 *
 * Merges and deduplicates results from parallel task execution.
 * Supports various aggregation strategies based on task type.
 */

import { DEDUP_CONFIG } from "@constants/parallel";
import type {
  ParallelExecutionResult,
  AggregatedResults,
  DeduplicationKey,
  DeduplicationResult,
} from "@/types/parallel";

// ============================================================================
// Result Collection
// ============================================================================

/**
 * Collect results into aggregated structure
 */
export const collectResults = <TOutput>(
  results: ParallelExecutionResult<TOutput>[],
): AggregatedResults<TOutput> => {
  const successful = results.filter((r) => r.status === "completed").length;
  const failed = results.filter(
    (r) => r.status === "error" || r.status === "timeout",
  ).length;
  const cancelled = results.filter((r) => r.status === "cancelled").length;

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return {
    results,
    successful,
    failed,
    cancelled,
    totalDuration,
  };
};

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Create a deduplication key from an object
 */
export const createDeduplicationKey = <T>(
  item: T,
  keyExtractor: (item: T) => DeduplicationKey,
): string => {
  const key = keyExtractor(item);
  return JSON.stringify(key);
};

/**
 * Deduplicate results based on a key extractor
 */
export const deduplicateResults = <T>(
  items: T[],
  keyExtractor: (item: T) => DeduplicationKey,
): DeduplicationResult<T> => {
  const seen = new Map<string, T>();
  let duplicateCount = 0;
  let mergedCount = 0;

  for (const item of items) {
    const key = createDeduplicationKey(item, keyExtractor);

    if (seen.has(key)) {
      duplicateCount++;
      // Could implement merging logic here if needed
    } else {
      seen.set(key, item);
    }
  }

  return {
    unique: Array.from(seen.values()),
    duplicateCount,
    mergedCount,
  };
};

/**
 * Deduplicate file results (by path)
 */
export const deduplicateFileResults = (
  results: Array<{ path: string; content?: string }>,
): DeduplicationResult<{ path: string; content?: string }> => {
  return deduplicateResults(results, (item) => ({
    type: "file",
    path: item.path,
  }));
};

/**
 * Deduplicate search results (by path and content)
 */
export const deduplicateSearchResults = <
  T extends { path: string; match?: string },
>(
  results: T[],
): DeduplicationResult<T> => {
  return deduplicateResults(results, (item) => ({
    type: "search",
    path: item.path,
    content: item.match,
  }));
};

// ============================================================================
// Result Merging
// ============================================================================

/**
 * Merge multiple arrays of results
 */
export const mergeArrayResults = <T>(arrays: T[][]): T[] => {
  return arrays.flat();
};

/**
 * Merge object results (shallow merge)
 */
export const mergeObjectResults = <T extends Record<string, unknown>>(
  objects: T[],
): T => {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {} as T);
};

/**
 * Merge results by priority (later results override earlier)
 */
export const mergeByPriority = <T>(
  results: ParallelExecutionResult<T>[],
): T | undefined => {
  // Sort by completion time (most recent last)
  const sorted = [...results].sort((a, b) => a.completedAt - b.completedAt);

  // Return the most recent successful result
  const successful = sorted.filter(
    (r) => r.status === "completed" && r.result !== undefined,
  );

  return successful.length > 0
    ? successful[successful.length - 1].result
    : undefined;
};

// ============================================================================
// Content Similarity
// ============================================================================

/**
 * Calculate similarity between two strings using Jaccard index
 */
const calculateSimilarity = (a: string, b: string): number => {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const aTokens = new Set(a.toLowerCase().split(/\s+/));
  const bTokens = new Set(b.toLowerCase().split(/\s+/));

  const intersection = [...aTokens].filter((token) => bTokens.has(token));
  const union = new Set([...aTokens, ...bTokens]);

  return intersection.length / union.size;
};

/**
 * Find similar results based on content
 */
export const findSimilarResults = <T>(
  items: T[],
  contentExtractor: (item: T) => string,
  threshold: number = DEDUP_CONFIG.SIMILARITY_THRESHOLD,
): Map<T, T[]> => {
  const similarGroups = new Map<T, T[]>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const content = contentExtractor(item);
    const similar: T[] = [];

    for (let j = i + 1; j < items.length; j++) {
      const otherItem = items[j];
      const otherContent = contentExtractor(otherItem);
      const similarity = calculateSimilarity(content, otherContent);

      if (similarity >= threshold) {
        similar.push(otherItem);
      }
    }

    if (similar.length > 0) {
      similarGroups.set(item, similar);
    }
  }

  return similarGroups;
};

// ============================================================================
// Aggregation Strategies
// ============================================================================

/**
 * Aggregate results as a list (concatenate all)
 */
export const aggregateAsList = <T>(
  results: ParallelExecutionResult<T[]>[],
): T[] => {
  const arrays = results
    .filter((r) => r.status === "completed" && r.result)
    .map((r) => r.result!);

  return mergeArrayResults(arrays);
};

/**
 * Aggregate results as a map (by key)
 */
export const aggregateAsMap = <T extends Record<string, unknown>>(
  results: ParallelExecutionResult<T>[],
  keyExtractor: (result: T) => string,
): Map<string, T> => {
  const map = new Map<string, T>();

  for (const result of results) {
    if (result.status === "completed" && result.result) {
      const key = keyExtractor(result.result);
      map.set(key, result.result);
    }
  }

  return map;
};

/**
 * Aggregate results and return first non-empty
 */
export const aggregateFirstNonEmpty = <T>(
  results: ParallelExecutionResult<T>[],
): T | undefined => {
  const successful = results
    .filter((r) => r.status === "completed" && r.result !== undefined)
    .sort((a, b) => a.completedAt - b.completedAt);

  return successful.length > 0 ? successful[0].result : undefined;
};

/**
 * Aggregate numeric results (sum)
 */
export const aggregateSum = (
  results: ParallelExecutionResult<number>[],
): number => {
  return results
    .filter((r) => r.status === "completed" && typeof r.result === "number")
    .reduce((sum, r) => sum + r.result!, 0);
};

/**
 * Aggregate boolean results (all true)
 */
export const aggregateAll = (
  results: ParallelExecutionResult<boolean>[],
): boolean => {
  const completed = results.filter(
    (r) => r.status === "completed" && typeof r.result === "boolean",
  );

  return completed.length > 0 && completed.every((r) => r.result === true);
};

/**
 * Aggregate boolean results (any true)
 */
export const aggregateAny = (
  results: ParallelExecutionResult<boolean>[],
): boolean => {
  return results.some((r) => r.status === "completed" && r.result === true);
};
