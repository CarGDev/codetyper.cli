/**
 * Apply Patch Types
 *
 * Types for unified diff parsing and application.
 * Supports fuzzy matching and rollback on failure.
 */

/**
 * Patch line type
 */
export type PatchLineType =
  | "context"     // Unchanged line (starts with space)
  | "addition"    // Added line (starts with +)
  | "deletion"    // Removed line (starts with -)
  | "header";     // Hunk header

/**
 * Single line in a patch
 */
export interface PatchLine {
  type: PatchLineType;
  content: string;
  originalLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Patch hunk (a contiguous block of changes)
 */
export interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: PatchLine[];
  header: string;
}

/**
 * Parsed patch file for a single file
 */
export interface ParsedFilePatch {
  oldPath: string;
  newPath: string;
  hunks: PatchHunk[];
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

/**
 * Complete parsed patch (may contain multiple files)
 */
export interface ParsedPatch {
  files: ParsedFilePatch[];
  rawPatch: string;
}

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
  found: boolean;
  lineNumber: number;
  offset: number;
  confidence: number;
}

/**
 * Hunk application result
 */
export interface HunkApplicationResult {
  success: boolean;
  hunkIndex: number;
  appliedAt?: number;
  error?: string;
  fuzzyOffset?: number;
}

/**
 * File patch result
 */
export interface FilePatchResult {
  success: boolean;
  filePath: string;
  hunksApplied: number;
  hunksFailed: number;
  hunkResults: HunkApplicationResult[];
  newContent?: string;
  error?: string;
}

/**
 * Overall patch application result
 */
export interface ApplyPatchResult {
  success: boolean;
  filesPatched: number;
  filesFailed: number;
  fileResults: FilePatchResult[];
  rollbackAvailable: boolean;
  error?: string;
}

/**
 * Apply patch parameters
 */
export interface ApplyPatchParams {
  patch: string;
  targetFile?: string;
  dryRun?: boolean;
  fuzz?: number;
  reverse?: boolean;
}

/**
 * Rollback information
 */
export interface PatchRollback {
  filePath: string;
  originalContent: string;
  patchedContent: string;
  timestamp: number;
}

/**
 * Patch validation result
 */
export interface PatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileCount: number;
  hunkCount: number;
}

/**
 * Context line match options
 */
export interface ContextMatchOptions {
  fuzz: number;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
}
