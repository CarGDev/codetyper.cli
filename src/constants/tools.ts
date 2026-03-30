/**
 * Tool system constants
 */

export const SCHEMA_SKIP_KEYS = ["$schema"] as const;

export const SCHEMA_SKIP_VALUES: Record<string, unknown> = {
  additionalProperties: false,
} as const;

export type SchemaSkipKey = (typeof SCHEMA_SKIP_KEYS)[number];

export const TOOL_NAMES = ["read", "glob", "grep"];

/**
 * Tools that can modify files — used for tracking modified files in the TUI
 */
export const FILE_MODIFYING_TOOLS = [
  "write",
  "edit",
  "multi_edit",
  "apply_patch",
  "bash",
] as const;

/**
 * Tool filter profiles
 *
 * Instead of sending all 15+ built-in tools on every request,
 * filter to only the tools relevant for the current task.
 * Saves ~5,000-8,000 tokens per request.
 */
export type ToolFilterProfile =
  | "full"       // All tools (default for general agent)
  | "explore"    // Read-only exploration
  | "code"       // Code editing focused
  | "test"       // Testing focused
  | "review"     // Code review (read + search)
  | "plan"       // Planning (read + search + todo)
  | "chat"       // Chat mode (read-only, no modifications);

/**
 * Tool names allowed per filter profile.
 * Tools not in the set are excluded from the API call.
 */
/**
 * complete_task is in EVERY profile — it's the only way to finish.
 */
export const TOOL_FILTER_PROFILES: Record<ToolFilterProfile, Set<string>> = {
  full: new Set([
    "bash", "read", "write", "edit", "multi_edit", "apply_patch",
    "glob", "grep", "todo_read", "todo_write",
    "web_search", "web_fetch", "lsp", "task_agent", "plan_approval", "ask_user",
    "complete_task",
  ]),
  explore: new Set([
    "read", "glob", "grep", "web_search", "web_fetch", "lsp",
    "complete_task",
  ]),
  code: new Set([
    "bash", "read", "write", "edit", "multi_edit", "apply_patch",
    "glob", "grep", "lsp", "complete_task",
  ]),
  test: new Set([
    "bash", "read", "write", "edit", "glob", "grep", "lsp",
    "complete_task",
  ]),
  review: new Set([
    "read", "glob", "grep", "lsp", "web_search", "web_fetch",
    "complete_task",
  ]),
  plan: new Set([
    "read", "glob", "grep", "todo_read", "todo_write",
    "web_search", "web_fetch", "task_agent", "plan_approval", "ask_user",
    "complete_task",
  ]),
  chat: new Set([
    "read", "glob", "grep", "todo_read",
    "web_search", "web_fetch", "lsp", "complete_task",
  ]),
} as const;

/**
 * Tool output truncation limits
 * Prevents large tool results from bloating the conversation context
 */
export const TOOL_OUTPUT_MAX_BYTES = 10 * 1024; // 10KB hard limit (was 50KB — too much context waste)
export const TOOL_OUTPUT_MAX_LINES = 500;
export const TOOL_OUTPUT_HEAD_LINES = 200;
export const TOOL_OUTPUT_TAIL_LINES = 100;
export const TOOL_OUTPUT_TRUNCATION_NOTICE =
  "\n\n--- OUTPUT TRUNCATED ---\n" +
  "Output exceeded limit. Use `read` with offset/limit or `grep` to find specific content.\n" +
  "---\n\n";
