/**
 * Permission Pattern Index
 *
 * Indexes patterns by tool type for O(n/k) lookup instead of O(n)
 */

import type { ToolType, PermissionPattern } from "@/types/permissions";
import { parsePattern } from "@services/permissions/pattern-cache";

// =============================================================================
// Types
// =============================================================================

export interface PatternEntry {
  raw: string;
  parsed: PermissionPattern;
}

export interface PatternIndex {
  byTool: Map<ToolType, PatternEntry[]>;
  all: PatternEntry[];
  lastUpdated: number;
}

// =============================================================================
// Index Creation
// =============================================================================

/**
 * Create an empty pattern index
 */
export const createPatternIndex = (): PatternIndex => ({
  byTool: new Map(),
  all: [],
  lastUpdated: Date.now(),
});

/**
 * Build an index from a list of pattern strings
 */
export const buildPatternIndex = (patterns: string[]): PatternIndex => {
  const index = createPatternIndex();

  for (const raw of patterns) {
    const parsed = parsePattern(raw);
    if (!parsed) continue;

    const entry: PatternEntry = { raw, parsed };

    // Add to all
    index.all.push(entry);

    // Add to tool-specific list
    const toolList = index.byTool.get(parsed.tool);
    if (toolList) {
      toolList.push(entry);
    } else {
      index.byTool.set(parsed.tool, [entry]);
    }
  }

  index.lastUpdated = Date.now();
  return index;
};

// =============================================================================
// Index Operations
// =============================================================================

/**
 * Add a pattern to an existing index
 */
export const addToIndex = (
  index: PatternIndex,
  pattern: string,
): PatternIndex => {
  const parsed = parsePattern(pattern);
  if (!parsed) return index;

  // Check if already exists
  if (index.all.some((e) => e.raw === pattern)) {
    return index;
  }

  const entry: PatternEntry = { raw: pattern, parsed };
  const newAll = [...index.all, entry];

  const newByTool = new Map(index.byTool);
  const toolList = newByTool.get(parsed.tool) ?? [];
  newByTool.set(parsed.tool, [...toolList, entry]);

  return {
    byTool: newByTool,
    all: newAll,
    lastUpdated: Date.now(),
  };
};

/**
 * Remove a pattern from an index
 */
export const removeFromIndex = (
  index: PatternIndex,
  pattern: string,
): PatternIndex => {
  const newAll = index.all.filter((e) => e.raw !== pattern);

  if (newAll.length === index.all.length) {
    return index; // Pattern wasn't in index
  }

  const newByTool = new Map<ToolType, PatternEntry[]>();

  for (const [tool, entries] of index.byTool) {
    const filtered = entries.filter((e) => e.raw !== pattern);
    if (filtered.length > 0) {
      newByTool.set(tool, filtered);
    }
  }

  return {
    byTool: newByTool,
    all: newAll,
    lastUpdated: Date.now(),
  };
};

/**
 * Get patterns for a specific tool
 */
export const getPatternsForTool = (
  index: PatternIndex,
  tool: ToolType,
): PatternEntry[] => index.byTool.get(tool) ?? [];

/**
 * Check if a pattern exists in the index
 */
export const hasPattern = (index: PatternIndex, pattern: string): boolean =>
  index.all.some((e) => e.raw === pattern);

/**
 * Get all raw pattern strings
 */
export const getRawPatterns = (index: PatternIndex): string[] =>
  index.all.map((e) => e.raw);

// =============================================================================
// Index Statistics
// =============================================================================

export interface IndexStats {
  total: number;
  byTool: Record<string, number>;
  lastUpdated: number;
}

export const getIndexStats = (index: PatternIndex): IndexStats => {
  const byTool: Record<string, number> = {};

  for (const [tool, entries] of index.byTool) {
    byTool[tool] = entries.length;
  }

  return {
    total: index.all.length,
    byTool,
    lastUpdated: index.lastUpdated,
  };
};

// =============================================================================
// Index Merging
// =============================================================================

/**
 * Merge multiple indexes (for combining session, local, global)
 * Later indexes take precedence (no deduplication, just concatenation)
 */
export const mergeIndexes = (...indexes: PatternIndex[]): PatternIndex => {
  const merged = createPatternIndex();

  for (const index of indexes) {
    for (const entry of index.all) {
      merged.all.push(entry);

      const toolList = merged.byTool.get(entry.parsed.tool);
      if (toolList) {
        toolList.push(entry);
      } else {
        merged.byTool.set(entry.parsed.tool, [entry]);
      }
    }
  }

  merged.lastUpdated = Date.now();
  return merged;
};
