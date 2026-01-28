/**
 * Grep tool constants
 */

export const GREP_DEFAULTS = {
  MAX_RESULTS: 100,
  DEFAULT_PATTERN: "**/*",
  NO_MATCHES_EXIT_CODE: 1,
} as const;

export const GREP_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
] as const;

export const GREP_MESSAGES = {
  NO_MATCHES: "No matches found",
  SEARCH_FAILED: (error: unknown) => `Search failed: ${error}`,
  RIPGREP_FAILED: (message: string) => `ripgrep failed: ${message}`,
} as const;

export const GREP_COMMANDS = {
  RIPGREP: (pattern: string, directory: string) =>
    `rg --line-number --no-heading "${pattern}" "${directory}"`,
} as const;
