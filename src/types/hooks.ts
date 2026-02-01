/**
 * Hook System Type Definitions
 *
 * Types for lifecycle hooks that can intercept tool execution
 */

/**
 * Available hook event types
 */
export type HookEventType =
  | "PreToolUse"
  | "PostToolUse"
  | "SessionStart"
  | "SessionEnd"
  | "UserPromptSubmit"
  | "Stop";

/**
 * Hook definition from configuration
 */
export interface HookDefinition {
  /** Event type to trigger on */
  event: HookEventType;
  /** Path to bash script (relative to project root or absolute) */
  script: string;
  /** Timeout in milliseconds (default 30000) */
  timeout?: number;
  /** Whether the hook is enabled (default true) */
  enabled?: boolean;
  /** Optional name for logging/debugging */
  name?: string;
}

/**
 * Configuration for hooks
 */
export interface HooksConfig {
  hooks: HookDefinition[];
}

/**
 * Result of hook execution
 */
export type HookResult =
  | HookResultAllow
  | HookResultWarn
  | HookResultBlock
  | HookResultModify;

export interface HookResultAllow {
  action: "allow";
}

export interface HookResultWarn {
  action: "warn";
  message: string;
}

export interface HookResultBlock {
  action: "block";
  message: string;
}

export interface HookResultModify {
  action: "modify";
  updatedInput: Record<string, unknown>;
}

/**
 * Input passed to PreToolUse hooks via stdin
 */
export interface PreToolUseHookInput {
  sessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  workingDir: string;
}

/**
 * Input passed to PostToolUse hooks via stdin
 */
export interface PostToolUseHookInput {
  sessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  result: {
    success: boolean;
    output: string;
    error?: string;
  };
  workingDir: string;
}

/**
 * Input passed to SessionStart hooks via stdin
 */
export interface SessionStartHookInput {
  sessionId: string;
  workingDir: string;
  provider: string;
  model: string;
}

/**
 * Input passed to SessionEnd hooks via stdin
 */
export interface SessionEndHookInput {
  sessionId: string;
  workingDir: string;
  duration: number;
  messageCount: number;
}

/**
 * Input passed to UserPromptSubmit hooks via stdin
 */
export interface UserPromptSubmitHookInput {
  sessionId: string;
  prompt: string;
  workingDir: string;
}

/**
 * Input passed to Stop hooks via stdin
 */
export interface StopHookInput {
  sessionId: string;
  workingDir: string;
  reason: "interrupt" | "complete" | "error";
}

/**
 * Union of all hook input types
 */
export type HookInput =
  | PreToolUseHookInput
  | PostToolUseHookInput
  | SessionStartHookInput
  | SessionEndHookInput
  | UserPromptSubmitHookInput
  | StopHookInput;

/**
 * Hook execution context
 */
export interface HookExecutionContext {
  sessionId: string;
  workingDir: string;
  event: HookEventType;
}

/**
 * Hook execution error
 */
export interface HookExecutionError {
  hook: HookDefinition;
  error: string;
  exitCode?: number;
}
