/**
 * Bash tool constants
 */

export const BASH_DEFAULTS = {
  MAX_OUTPUT_LENGTH: 30000,
  TIMEOUT: 120000,
  KILL_DELAY: 1000,
} as const;

export const BASH_SIGNALS = {
  TERMINATE: "SIGTERM",
  KILL: "SIGKILL",
} as const;

export const BASH_MESSAGES = {
  PERMISSION_DENIED: "Permission denied by user",
  TIMED_OUT: (timeout: number) => `Command timed out after ${timeout}ms`,
  ABORTED: "Command aborted",
  EXIT_CODE: (code: number) => `Command exited with code ${code}`,
  TRUNCATED: "\n\n... (truncated)",
} as const;

export const BASH_DESCRIPTION = `Execute a shell command. Use this tool to run commands like git, npm, mkdir, etc.

Guidelines:
- Always provide a clear description of what the command does
- Use absolute paths when possible
- Be careful with destructive commands (rm, etc.)
- Commands that modify the filesystem will require user approval`;
