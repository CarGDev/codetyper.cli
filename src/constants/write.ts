/**
 * Write tool constants
 */

export const WRITE_MESSAGES = {
  PERMISSION_DENIED: "Permission denied by user",
} as const;

export const WRITE_TITLES = {
  CANCELLED: (path: string) => `Write cancelled: ${path}`,
  FAILED: (path: string) => `Write failed: ${path}`,
  WRITING: (name: string) => `Writing ${name}`,
  OVERWROTE: (path: string) => `Overwrote: ${path}`,
  CREATED: (path: string) => `Created: ${path}`,
  OVERWRITE_DESC: (path: string) => `Overwrite file: ${path}`,
  CREATE_DESC: (path: string) => `Create file: ${path}`,
} as const;

export const WRITE_DESCRIPTION = `Write content to a file. Creates the file if it doesn't exist, or overwrites if it does.

Guidelines:
- Use absolute paths
- Parent directories will be created automatically
- Requires user approval for file writes`;
