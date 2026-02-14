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
