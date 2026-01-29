/**
 * Chat service constants
 */

export const CHAT_TRUNCATE_DEFAULTS = {
  MAX_LINES: 10,
  MAX_LENGTH: 500,
} as const;

export const FILE_SIZE_LIMITS = {
  MAX_CONTEXT_FILE_SIZE: 100000,
} as const;

export const DIFF_PATTERNS = [
  /@@\s*-\d+/m,
  /---\s+[ab]?\//m,
  /\+\+\+\s+[ab]?\//m,
] as const;

export const GLOB_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
] as const;

export const CHAT_MESSAGES = {
  CONVERSATION_CLEARED: "Conversation cleared",
  SESSION_SAVED: "Session saved",
  LEARNING_SAVED: (scope: string) => `Learning saved (${scope})`,
  LEARNING_SKIPPED: "Learning skipped",
  NO_LEARNINGS:
    "No learnings saved yet. Use /remember to save learnings about your project.",
  NO_CONVERSATION:
    "No conversation to create learning from. Start a conversation first.",
  NO_LEARNINGS_DETECTED:
    'No learnings detected from the last exchange. Try being more explicit about preferences (e.g., "always use TypeScript", "prefer functional style").',
  UNKNOWN_COMMAND: (cmd: string) => `Unknown command: ${cmd}`,
  FILE_NOT_FOUND: (pattern: string) => `File not found: ${pattern}`,
  FILE_TOO_LARGE: (name: string, size: number) =>
    `File too large: ${name} (${Math.round(size / 1024)}KB)`,
  FILE_IS_BINARY: (name: string) => `Cannot add binary file: ${name}`,
  FILE_ADDED: (name: string) => `Added to context: ${name}`,
  FILE_ADD_FAILED: (error: unknown) => `Failed to add file: ${error}`,
  FILE_READ_FAILED: (error: unknown) => `Failed to read file: ${error}`,
  ANALYZE_FILES: "Analyze the files I've added to the context.",
  GITHUB_ISSUES_FOUND: (count: number, issues: string) =>
    `Found ${count} GitHub issue(s): ${issues}`,
  COMPACTION_STARTING: "Summarizing conversation history...",
  COMPACTION_CONTINUING: "Continuing with your request...",
} as const;

export const AUTH_MESSAGES = {
  ALREADY_LOGGED_IN: "Already logged in. Use /logout first to re-authenticate.",
  AUTH_SUCCESS: "Successfully authenticated with GitHub Copilot!",
  AUTH_FAILED: (error: string) => `Authentication failed: ${error}`,
  AUTH_START_FAILED: (error: string) =>
    `Failed to start authentication: ${error}`,
  LOGGED_OUT:
    "Logged out from GitHub Copilot. Run /login to authenticate again.",
  NOT_LOGGED_IN: "Not logged in. Run /login to authenticate.",
  NO_LOGIN_REQUIRED: (provider: string) =>
    `Provider ${provider} doesn't require login.`,
  NO_LOGOUT_SUPPORT: (provider: string) =>
    `Provider ${provider} doesn't support logout.`,
  OLLAMA_NO_AUTH: "Ollama is a local provider - no authentication required.",
  COPILOT_AUTH_INSTRUCTIONS: (uri: string, code: string) =>
    `To authenticate with GitHub Copilot:\n\n1. Open: ${uri}\n2. Enter code: ${code}\n\nWaiting for authentication...`,
  LOGGED_IN_AS: (login: string, name?: string) =>
    `Logged in as: ${login}${name ? ` (${name})` : ""}`,
} as const;

export const MODEL_MESSAGES = {
  MODEL_AUTO: "Model set to auto - the provider will choose the best model.",
  MODEL_CHANGED: (model: string) => `Model changed to: ${model}`,
} as const;

// Re-export HELP_TEXT from prompts for backward compatibility
export { HELP_TEXT } from "@prompts/ui/help";

export const LEARNING_CONFIDENCE_THRESHOLD = 0.7;
export const MAX_LEARNINGS_DISPLAY = 20;

export type CommandName =
  | "help"
  | "h"
  | "clear"
  | "c"
  | "save"
  | "s"
  | "context"
  | "usage"
  | "u"
  | "model"
  | "models"
  | "agent"
  | "a"
  | "theme"
  | "mcp"
  | "mode"
  | "whoami"
  | "login"
  | "logout"
  | "provider"
  | "p"
  | "status"
  | "remember"
  | "learnings"
  | "logs";
