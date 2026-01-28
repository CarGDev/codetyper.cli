/**
 * Read tool constants
 */

export const READ_DEFAULTS = {
  MAX_LINES: 2000,
  MAX_LINE_LENGTH: 2000,
  MAX_BYTES: 100000,
  LINE_NUMBER_PAD: 6,
} as const;

export const READ_MESSAGES = {
  PERMISSION_DENIED: "Permission denied by user",
} as const;

export const READ_TITLES = {
  DENIED: (path: string) => `Read denied: ${path}`,
  FAILED: (path: string) => `Read failed: ${path}`,
  READING: (name: string) => `Reading ${name}`,
  DIRECTORY: (path: string) => `Listed directory: ${path}`,
} as const;

export const READ_DESCRIPTION = `Read the contents of a file. Returns the file content with line numbers.

Guidelines:
- Use absolute paths
- By default reads up to 2000 lines
- Long lines are truncated at 2000 characters
- Use offset and limit for large files`;
