/**
 * Execution Control Constants
 *
 * Constants for agent execution control (pause/resume/abort).
 */

/**
 * Keyboard shortcuts for execution control
 */
export const EXECUTION_CONTROL_KEYS = {
  /** Toggle pause/resume (Ctrl+P) */
  TOGGLE_PAUSE: "ctrl+p",
  /** Abort execution (Ctrl+C) */
  ABORT: "ctrl+c",
  /** Abort with rollback (Ctrl+Z) */
  ABORT_WITH_ROLLBACK: "ctrl+z",
  /** Toggle step mode (Ctrl+Shift+S) */
  TOGGLE_STEP_MODE: "ctrl+shift+s",
  /** Advance one step in step mode (Enter when waiting) */
  STEP: "return",
} as const;

/**
 * Execution control status messages
 */
export const EXECUTION_CONTROL_MESSAGES = {
  PAUSED: "⏸ Execution paused. Press Ctrl+P to resume.",
  RESUMED: "▶ Execution resumed.",
  STEP_MODE_ENABLED: "🚶 Step mode enabled. Press Enter to advance each tool call.",
  STEP_MODE_DISABLED: "🏃 Step mode disabled. Execution will continue automatically.",
  WAITING_FOR_STEP: (toolName: string): string =>
    `⏳ Step mode: Ready to execute ${toolName}. Press Enter to continue.`,
  ROLLBACK_ACTION: (description: string): string =>
    `↩ Rolling back: ${description}`,
  ROLLBACK_COMPLETE: (count: number): string =>
    `✓ Rollback complete. ${count} action(s) undone.`,
  ABORT_INITIATED: (rollbackCount: number): string =>
    rollbackCount > 0
      ? `Aborting with rollback of ${rollbackCount} action(s)...`
      : "Aborting execution...",
} as const;

/**
 * Help text for execution control
 */
export const EXECUTION_CONTROL_HELP = `
Execution Control:
  Ctrl+P         - Toggle pause/resume
  Ctrl+C         - Abort execution
  Ctrl+Z         - Abort with rollback (undo file changes)
  Ctrl+Shift+S   - Toggle step-by-step mode
  Enter          - Advance one step (when in step mode)
` as const;
