/**
 * Tool system constants
 */

export const SCHEMA_SKIP_KEYS = ["$schema"] as const;

export const SCHEMA_SKIP_VALUES: Record<string, unknown> = {
  additionalProperties: false,
} as const;

export type SchemaSkipKey = (typeof SCHEMA_SKIP_KEYS)[number];

export const TOOL_NAMES = ["read", "glob", "grep"];
