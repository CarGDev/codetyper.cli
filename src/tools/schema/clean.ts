/**
 * JSON Schema cleaning utilities for OpenAI/Copilot API compatibility
 */

import {
  SCHEMA_SKIP_KEYS,
  SCHEMA_SKIP_VALUES,
  type SchemaSkipKey,
} from "@constants/tools";

const shouldSkipKey = (key: string): boolean =>
  SCHEMA_SKIP_KEYS.includes(key as SchemaSkipKey);

const shouldSkipValue = (key: string, value: unknown): boolean =>
  SCHEMA_SKIP_VALUES[key] === value;

const isNestedObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const cleanJsonSchema = (
  schema: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (shouldSkipKey(key)) {
      continue;
    }

    if (shouldSkipValue(key, value)) {
      continue;
    }

    if (isNestedObject(value)) {
      result[key] = cleanJsonSchema(value);
    } else {
      result[key] = value;
    }
  }

  return result;
};
