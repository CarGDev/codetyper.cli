/**
 * TUI App Mode Utilities
 *
 * Helper functions for mode checking in the TUI App
 */

import type { AppMode } from "@/types/tui";

// Modes that lock the input
const LOCKED_MODES: ReadonlySet<AppMode> = new Set([
  "thinking",
  "tool_execution",
  "permission_prompt",
  "learning_prompt",
]);

// Commands that open their own modal
const MODAL_COMMANDS: ReadonlySet<string> = new Set([
  "model",
  "models",
  "agent",
  "theme",
  "mcp",
]);

/**
 * Check if input is locked based on current mode
 */
export const isInputLocked = (mode: AppMode): boolean => {
  return LOCKED_MODES.has(mode);
};

/**
 * Check if a command opens a modal
 */
export const isModalCommand = (command: string): boolean => {
  return MODAL_COMMANDS.has(command);
};

/**
 * Check if main input should be active
 */
export const isMainInputActive = (
  mode: AppMode,
  isLocked: boolean,
): boolean => {
  return (
    !isLocked &&
    mode !== "command_menu" &&
    mode !== "model_select" &&
    mode !== "agent_select" &&
    mode !== "theme_select" &&
    mode !== "mcp_select" &&
    mode !== "learning_prompt"
  );
};

/**
 * Check if currently processing (thinking or tool execution)
 */
export const isProcessing = (mode: AppMode): boolean => {
  return mode === "thinking" || mode === "tool_execution";
};
