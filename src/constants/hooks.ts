/**
 * Hook System Constants
 *
 * Constants for lifecycle hooks
 */

import type { HookEventType } from "@/types/hooks";

/**
 * Hook configuration file name
 */
export const HOOKS_CONFIG_FILE = "hooks.json";

/**
 * Default hook timeout in milliseconds
 */
export const DEFAULT_HOOK_TIMEOUT = 30000;

/**
 * Default progress bar width
 * */
export const DEFAULT_BAR_WIDTH = 40;

/**
 * Hook exit codes and their meanings
 */
export const HOOK_EXIT_CODES = {
  /** Allow execution to continue */
  ALLOW: 0,
  /** Warn but continue execution */
  WARN: 1,
  /** Block execution */
  BLOCK: 2,
} as const;

/**
 * Hook event type labels for display
 */
export const HOOK_EVENT_LABELS: Record<HookEventType, string> = {
  PreToolUse: "Pre-Tool Use",
  PostToolUse: "Post-Tool Use",
  SessionStart: "Session Start",
  SessionEnd: "Session End",
  UserPromptSubmit: "User Prompt Submit",
  Stop: "Stop",
};

/**
 * Hook event type descriptions
 */
export const HOOK_EVENT_DESCRIPTIONS: Record<HookEventType, string> = {
  PreToolUse:
    "Runs before a tool is executed. Can modify args or block execution.",
  PostToolUse: "Runs after a tool completes. For notifications or logging.",
  SessionStart: "Runs when a new session begins.",
  SessionEnd: "Runs when a session ends.",
  UserPromptSubmit: "Runs when user submits a prompt. Can modify or block.",
  Stop: "Runs when execution is stopped (interrupt, complete, or error).",
};

/**
 * All available hook event types
 */
export const HOOK_EVENT_TYPES: readonly HookEventType[] = [
  "PreToolUse",
  "PostToolUse",
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "Stop",
] as const;

/**
 * Maximum output size from hook script in bytes
 */
export const MAX_HOOK_OUTPUT_SIZE = 1024 * 1024; // 1MB

/**
 * Hook script execution shell
 */
export const HOOK_SHELL = "/bin/bash";

/**
 * Environment variables passed to hooks
 */
export const HOOK_ENV_PREFIX = "CODETYPER_HOOK_";
