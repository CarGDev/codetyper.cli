/**
 * Permission Pattern Cache
 *
 * Parses patterns once and caches the result for fast lookup
 */

import type { ToolType, PermissionPattern } from "@/types/permissions";

// =============================================================================
// Constants
// =============================================================================

const SIMPLE_TOOLS: ToolType[] = ["WebSearch"];

// =============================================================================
// Cache State
// =============================================================================

const patternCache = new Map<string, PermissionPattern | null>();

// =============================================================================
// Pattern Parsing
// =============================================================================

/**
 * Parse a pattern string into a structured object
 * Results are cached for subsequent lookups
 */
export const parsePattern = (pattern: string): PermissionPattern | null => {
  // Check cache first
  const cached = patternCache.get(pattern);
  if (cached !== undefined) {
    return cached;
  }

  const parsed = parsePatternInternal(pattern);
  patternCache.set(pattern, parsed);
  return parsed;
};

/**
 * Internal parsing logic (not cached)
 */
const parsePatternInternal = (pattern: string): PermissionPattern | null => {
  // Match patterns like: Bash(command:args), Read(path), WebFetch(domain:example.com)
  const match = pattern.match(/^(\w+)\(([^)]*)\)$/);

  if (!match) {
    // Simple patterns like "WebSearch"
    if (SIMPLE_TOOLS.includes(pattern as ToolType)) {
      return { tool: pattern as ToolType };
    }
    return null;
  }

  const tool = match[1] as ToolType;
  const content = match[2];

  const toolParsers: Partial<Record<ToolType, () => PermissionPattern>> = {
    Bash: () => parseBashPattern(content),
    WebFetch: () => parseWebFetchPattern(content),
    Read: () => ({ tool, path: content }),
    Write: () => ({ tool, path: content }),
    Edit: () => ({ tool, path: content }),
  };

  const parser = toolParsers[tool];
  if (parser) {
    return parser();
  }

  // Default: treat as path pattern
  return { tool, path: content };
};

/**
 * Parse Bash pattern content
 */
const parseBashPattern = (content: string): PermissionPattern => {
  const colonIdx = content.lastIndexOf(":");

  if (colonIdx === -1) {
    return { tool: "Bash", command: content, args: "*" };
  }

  return {
    tool: "Bash",
    command: content.slice(0, colonIdx),
    args: content.slice(colonIdx + 1),
  };
};

/**
 * Parse WebFetch pattern content
 */
const parseWebFetchPattern = (content: string): PermissionPattern => {
  if (content.startsWith("domain:")) {
    return { tool: "WebFetch", domain: content.slice(7) };
  }
  return { tool: "WebFetch", path: content };
};

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear the pattern cache
 */
export const clearPatternCache = (): void => {
  patternCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): { size: number; hits: number } => ({
  size: patternCache.size,
  hits: 0, // Could track hits if needed
});

/**
 * Pre-warm cache with patterns
 */
export const warmCache = (patterns: string[]): void => {
  for (const pattern of patterns) {
    parsePattern(pattern);
  }
};
