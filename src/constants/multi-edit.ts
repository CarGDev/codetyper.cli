/**
 * MultiEdit Tool Constants
 *
 * Configuration for batch file editing operations
 */

export const MULTI_EDIT_DEFAULTS = {
  MAX_EDITS: 50, // Maximum number of edits in a single batch
  MAX_FILE_SIZE: 1024 * 1024, // 1MB max file size
} as const;

export const MULTI_EDIT_TITLES = {
  VALIDATING: (count: number) => `Validating ${count} edits...`,
  APPLYING: (current: number, total: number) =>
    `Applying edit ${current}/${total}`,
  SUCCESS: (count: number) => `Applied ${count} edits`,
  PARTIAL: (success: number, failed: number) =>
    `Applied ${success} edits, ${failed} failed`,
  FAILED: "Multi-edit failed",
  ROLLBACK: "Rolling back changes...",
} as const;

export const MULTI_EDIT_MESSAGES = {
  NO_EDITS: "No edits provided",
  TOO_MANY_EDITS: (max: number) => `Too many edits (max: ${max})`,
  VALIDATION_FAILED: "Validation failed for one or more edits",
  ATOMIC_FAILURE: "Atomic edit failed - all changes rolled back",
  DUPLICATE_FILE: (path: string) =>
    `Multiple edits to same file must be ordered: ${path}`,
  OLD_STRING_NOT_FOUND: (path: string, preview: string) =>
    `Old string not found in ${path}: "${preview}..."`,
  OLD_STRING_NOT_UNIQUE: (path: string, count: number) =>
    `Old string found ${count} times in ${path} (must be unique)`,
  FILE_NOT_FOUND: (path: string) => `File not found: ${path}`,
  FILE_TOO_LARGE: (path: string) => `File too large: ${path}`,
} as const;

export const MULTI_EDIT_DESCRIPTION = `Edit multiple files in a single atomic operation.

Use this tool when you need to:
- Make related changes across multiple files
- Refactor code that spans several files
- Apply consistent changes to many files

All edits are validated before any changes are applied.
If any edit fails validation, no changes are made.

Each edit requires:
- file_path: Absolute path to the file
- old_string: The exact text to find and replace
- new_string: The replacement text

The old_string must be unique in the file. If it appears multiple times,
provide more context to make it unique.`;
