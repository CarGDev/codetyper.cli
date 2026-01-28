/**
 * Edit tool constants
 */

export const EDIT_MESSAGES = {
  NOT_FOUND:
    "Could not find the text to replace. Make sure old_string matches exactly.",
  MULTIPLE_OCCURRENCES: (count: number) =>
    `old_string appears ${count} times. Use replace_all=true or provide more context to make it unique.`,
  PERMISSION_DENIED: "Permission denied by user",
} as const;

export const EDIT_TITLES = {
  FAILED: (path: string) => `Edit failed: ${path}`,
  CANCELLED: (path: string) => `Edit cancelled: ${path}`,
  SUCCESS: (path: string) => `Edited: ${path}`,
  EDITING: (name: string) => `Editing ${name}`,
} as const;

export const EDIT_DESCRIPTION = `Edit a file by replacing specific text. The old_string must match exactly.

Guidelines:
- old_string must be unique in the file (or use replace_all)
- Preserve indentation exactly as it appears in the file
- Requires user approval for edits`;
