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
 * Resolve a path to absolute for consistent matching
 */
const resolveToAbsolute = (filePath: string): string =>
  path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.normalize(path.resolve(process.cwd(), filePath));

/**
 * Check if a file path matches a pattern string.
 *
 * Both filePath and pattern are resolved to absolute paths before comparison
 * to prevent mismatches between relative patterns and absolute tool paths.
 */
export const matchesPathPattern = (
  filePath: string,
  pattern: string,
): boolean => {
  // Wildcard: match everything
  if (pattern === "*") return true;

  // Extension pattern: *.ts matches foo.ts (no path resolution needed)
  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1); // .ts
    return path.normalize(filePath).endsWith(ext);
  }

  const absolutePath = resolveToAbsolute(filePath);

  // Directory prefix: src/* or /abs/path/src/*
  if (pattern.endsWith("/*") || pattern.endsWith("*")) {
    const rawPrefix = pattern.slice(0, pattern.lastIndexOf("*"));
    const absolutePrefix = resolveToAbsolute(rawPrefix);
    return absolutePath.startsWith(absolutePrefix);
  }

  const absolutePattern = resolveToAbsolute(pattern);

  // Exact match
  if (absolutePath === absolutePattern) {
    return true;
  }

  // Path-boundary substring match (prevent "src" matching "src-backup")
  const sepPattern = path.sep + absolutePattern;
  if (absolutePath.includes(sepPattern + path.sep) || absolutePath.endsWith(sepPattern)) {
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
 * Generate a pattern suggestion for a file operation.
 * Uses absolute paths for directory patterns to ensure consistent matching.
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

  // Directory-based pattern using absolute path
  const absoluteDir = path.dirname(resolveToAbsolute(filePath));
  if (absoluteDir && absoluteDir !== ".") {
    return `${tool}(${absoluteDir}/*)`;
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
