/**
 * Constants for command handlers
 */

import type { ConfigKey, ConfigAction } from "@/types/handlers";
import type { Provider } from "@/types/common";

export const VALID_CONFIG_KEYS: readonly ConfigKey[] = [
  "provider",
  "model",
  "maxIterations",
  "timeout",
] as const;

export const VALID_PROVIDERS: readonly Provider[] = [
  "copilot",
  "ollama",
] as const;

export const VALID_CONFIG_ACTIONS: readonly ConfigAction[] = [
  "show",
  "path",
  "set",
] as const;

export const CONFIG_VALIDATION = {
  MIN_TIMEOUT_MS: 1000,
  MIN_ITERATIONS: 1,
} as const;

export const INTENT_KEYWORDS = {
  fix: ["fix", "bug"],
  test: ["test", "spec"],
  refactor: ["refactor", "improve"],
  code: ["add", "implement"],
  document: ["document", "comment"],
} as const;

export const CLASSIFICATION_CONFIDENCE = {
  HIGH: 0.9,
  MEDIUM: 0.85,
  DEFAULT: 0.8,
  LOW: 0.75,
  THRESHOLD: 0.7,
} as const;
