/**
 * File Path Pattern Matcher
 *
 * Optimized matching for Read/Write/Edit patterns
 */

import * as path from "path";

import type { PermissionPattern } from "@/types/permissions";
import type {
  PatternEntry,
  PatternIndex,
} from "@services/permissions/pattern-index";
import { getPatternsForTool } from "@services/permissions/pattern-index";

// =============================================================================
// Pattern Matching
// =============================================================================

/**
 * Check if a file path matches a pattern string
 */
export const matchesPathPattern = (
  filePath: string,
  pattern: string,
): boolean => {
  // Wildcard: match everything
  if (pattern === "*") return true;

  const normalizedPath = path.normalize(filePath);
  const normalizedPattern = path.normalize(pattern);

  // Directory prefix: src/* matches src/foo.ts
  if (pattern.endsWith("/*") || pattern.endsWith("*")) {
    const prefix = normalizedPattern.slice(0, -1);
    if (normalizedPath.startsWith(prefix)) {
      return true;
    }
  }

  // Extension pattern: *.ts matches foo.ts
  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1); // .ts
    if (normalizedPath.endsWith(ext)) {
      return true;
    }
  }

  // Exact match
  if (normalizedPath === normalizedPattern) {
    return true;
  }

  // Substring match (for partial paths)
  if (normalizedPath.includes(normalizedPattern)) {
    return true;
  }

  return false;
};

/**
 * Check if a file path matches a parsed pattern
 */
export const matchesFilePattern = (
  filePath: string,
  pattern: PermissionPattern,
): boolean => {
  if (!pattern.path) return false;
  return matchesPathPattern(filePath, pattern.path);
};

// =============================================================================
// Index-Based Matching
// =============================================================================

type FileOpTool = "Read" | "Write" | "Edit";

/**
 * Check if a file operation is allowed by patterns in the index
 */
export const isFileOpAllowedByIndex = (
  tool: FileOpTool,
  filePath: string,
  index: PatternIndex,
): boolean => {
  const patterns = getPatternsForTool(index, tool);

  for (const entry of patterns) {
    if (entry.parsed.path && matchesPathPattern(filePath, entry.parsed.path)) {
      return true;
    }
  }

  return false;
};

/**
 * Find all matching patterns for a file operation
 */
export const findMatchingFilePatterns = (
  tool: FileOpTool,
  filePath: string,
  index: PatternIndex,
): PatternEntry[] => {
  const patterns = getPatternsForTool(index, tool);
  return patterns.filter(
    (entry) =>
      entry.parsed.path && matchesPathPattern(filePath, entry.parsed.path),
  );
};

// =============================================================================
// Pattern Generation
// =============================================================================

/**
 * Generate a pattern suggestion for a file operation
 */
export const generateFilePattern = (
  tool: FileOpTool,
  filePath: string,
): string => {
  const ext = path.extname(filePath);

  // Prefer extension-based patterns for common extensions
  if (ext && isCommonExtension(ext)) {
    return `${tool}(*${ext})`;
  }

  // Directory-based pattern
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") {
    return `${tool}(${dir}/*)`;
  }

  // Fall back to basename
  return `${tool}(${path.basename(filePath)})`;
};

/**
 * Check if extension is common enough to suggest extension-based pattern
 */
const isCommonExtension = (ext: string): boolean => {
  const common = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".css",
    ".scss",
    ".html",
    ".yml",
    ".yaml",
    ".toml",
    ".lua",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".c",
    ".cpp",
    ".h",
  ];
  return common.includes(ext.toLowerCase());
};

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Normalize a file path for consistent matching
 */
export const normalizePath = (filePath: string): string =>
  path.normalize(filePath);

/**
 * Check if a path is within a directory
 */
export const isPathInDirectory = (
  filePath: string,
  directory: string,
): boolean => {
  const normalizedFile = path.normalize(path.resolve(filePath));
  const normalizedDir = path.normalize(path.resolve(directory));
  return normalizedFile.startsWith(normalizedDir + path.sep);
};
