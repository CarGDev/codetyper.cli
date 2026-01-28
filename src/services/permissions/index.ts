/**
 * Permission System Index
 *
 * Provides optimized permission checking with cached patterns and indexed lookups.
 * Maintains backward compatibility with existing API.
 */

// Re-export optimized implementation
export {
  initializePermissions,
  resetPermissions,
  setWorkingDir,
  setPermissionHandler,
  isBashAllowed,
  isBashDenied,
  isFileOpAllowed,
  addSessionPattern,
  addGlobalPattern,
  addLocalPattern,
  listPatterns,
  clearSessionPatterns,
  getPermissionStats,
  generateBashPattern,
  generateFilePattern,
  parsePattern,
  matchesBashPattern,
  matchesPathPattern,
  promptBashPermission,
  promptFilePermission,
  promptPermission,
  getPermissionLevel,
} from "@services/permissions/optimized";

// Re-export pattern cache utilities
export {
  clearPatternCache,
  getCacheStats,
  warmCache,
} from "@services/permissions/pattern-cache";

// Re-export pattern index utilities
export {
  buildPatternIndex,
  addToIndex,
  removeFromIndex,
  getPatternsForTool,
  hasPattern,
  getRawPatterns,
  mergeIndexes,
  getIndexStats,
  type PatternIndex,
  type PatternEntry,
  type IndexStats,
} from "@services/permissions/pattern-index";

// Re-export matchers
export {
  isBashAllowedByIndex,
  findMatchingBashPatterns,
  extractCommandPrefix,
  isFileOpAllowedByIndex,
  findMatchingFilePatterns,
  normalizePath,
  isPathInDirectory,
} from "@services/permissions/matchers";

// Re-export types
export type {
  ToolType,
  PermissionPattern,
  PermissionsConfig,
  PermissionPromptRequest,
  PermissionPromptResponse,
  PermissionHandler,
} from "@/types/permissions";
