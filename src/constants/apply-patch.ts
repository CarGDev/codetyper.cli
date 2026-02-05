/**
 * Apply Patch Constants
 *
 * Configuration for unified diff parsing and application.
 */

/**
 * Default configuration for patch application
 */
export const PATCH_DEFAULTS = {
  FUZZ: 2,
  MAX_FUZZ: 3,
  IGNORE_WHITESPACE: false,
  IGNORE_CASE: false,
  CONTEXT_LINES: 3,
} as const;

/**
 * Patch file patterns
 */
export const PATCH_PATTERNS = {
  HUNK_HEADER: /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/,
  FILE_HEADER_OLD: /^--- (.+?)(?:\t.*)?$/,
  FILE_HEADER_NEW: /^\+\+\+ (.+?)(?:\t.*)?$/,
  GIT_DIFF: /^diff --git a\/(.+) b\/(.+)$/,
  INDEX_LINE: /^index [a-f0-9]+\.\.[a-f0-9]+(?: \d+)?$/,
  BINARY_FILE: /^Binary files .+ differ$/,
  NEW_FILE: /^new file mode \d+$/,
  DELETED_FILE: /^deleted file mode \d+$/,
  RENAME_FROM: /^rename from (.+)$/,
  RENAME_TO: /^rename to (.+)$/,
  NO_NEWLINE: /^\\ No newline at end of file$/,
} as const;

/**
 * Line type prefixes
 */
export const LINE_PREFIXES = {
  CONTEXT: " ",
  ADDITION: "+",
  DELETION: "-",
} as const;

/**
 * Error messages
 */
export const PATCH_ERRORS = {
  INVALID_PATCH: "Invalid patch format",
  PARSE_FAILED: (detail: string) => `Failed to parse patch: ${detail}`,
  HUNK_FAILED: (index: number, reason: string) =>
    `Hunk #${index + 1} failed: ${reason}`,
  FILE_NOT_FOUND: (path: string) => `Target file not found: ${path}`,
  CONTEXT_MISMATCH: (line: number) => `Context mismatch at line ${line}`,
  FUZZY_MATCH_FAILED: (hunk: number) =>
    `Could not find match for hunk #${hunk + 1} even with fuzzy matching`,
  ALREADY_APPLIED: "Patch appears to be already applied",
  REVERSED_PATCH: "Patch appears to be reversed",
  BINARY_NOT_SUPPORTED: "Binary patches are not supported",
  WRITE_FAILED: (path: string, error: string) =>
    `Failed to write patched file ${path}: ${error}`,
} as const;

/**
 * Success messages
 */
export const PATCH_MESSAGES = {
  PARSING: "Parsing patch...",
  APPLYING: (file: string) => `Applying patch to ${file}`,
  APPLIED: (files: number, hunks: number) =>
    `Successfully applied ${hunks} hunk(s) to ${files} file(s)`,
  DRY_RUN: (files: number, hunks: number) =>
    `Dry run: ${hunks} hunk(s) would be applied to ${files} file(s)`,
  FUZZY_APPLIED: (hunk: number, offset: number) =>
    `Hunk #${hunk + 1} applied with fuzzy offset of ${offset}`,
  ROLLBACK_AVAILABLE: "Rollback is available if needed",
  SKIPPED_BINARY: (file: string) => `Skipped binary file: ${file}`,
} as const;

/**
 * Tool titles
 */
export const PATCH_TITLES = {
  APPLYING: (file: string) => `Patching: ${file}`,
  SUCCESS: (files: number) => `Patched ${files} file(s)`,
  PARTIAL: (success: number, failed: number) =>
    `Partial success: ${success} patched, ${failed} failed`,
  FAILED: "Patch failed",
  DRY_RUN: "Patch dry run",
  VALIDATING: "Validating patch",
} as const;

/**
 * Special path values
 */
export const SPECIAL_PATHS = {
  DEV_NULL: "/dev/null",
  A_PREFIX: "a/",
  B_PREFIX: "b/",
} as const;
