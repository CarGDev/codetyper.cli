/**
 * Vim Mode Type Definitions
 *
 * Types for vim-style navigation and editing
 */

/**
 * Vim mode states
 */
export type VimMode = "normal" | "insert" | "command" | "visual";

/**
 * Vim command action
 */
export type VimAction =
  | "scroll_up"
  | "scroll_down"
  | "scroll_half_up"
  | "scroll_half_down"
  | "goto_top"
  | "goto_bottom"
  | "enter_insert"
  | "enter_command"
  | "enter_visual"
  | "exit_mode"
  | "search_start"
  | "search_next"
  | "search_prev"
  | "execute_command"
  | "cancel"
  | "yank"
  | "paste"
  | "delete"
  | "undo"
  | "redo"
  | "word_forward"
  | "word_backward"
  | "line_start"
  | "line_end"
  | "none";

/**
 * Key binding definition
 */
export interface VimKeyBinding {
  /** Key to match */
  key: string;
  /** Mode this binding applies in */
  mode: VimMode;
  /** Action to execute */
  action: VimAction;
  /** Whether ctrl modifier is required */
  ctrl?: boolean;
  /** Whether shift modifier is required */
  shift?: boolean;
  /** Optional argument for the action */
  argument?: string | number;
  /** Description for help */
  description?: string;
}

/**
 * Vim state
 */
export interface VimState {
  /** Current mode */
  mode: VimMode;
  /** Whether vim mode is enabled */
  enabled: boolean;
  /** Current search pattern */
  searchPattern: string;
  /** Command buffer for : commands */
  commandBuffer: string;
  /** Cursor position for visual mode */
  visualStart: number | null;
  /** Count prefix for repeated actions */
  count: number;
  /** Pending operator (d, y, c, etc.) */
  pendingOperator: string | null;
  /** Last search direction */
  searchDirection: "forward" | "backward";
  /** Register for yank/paste */
  register: string;
  /** Search matches */
  searchMatches: VimSearchMatch[];
  /** Current search match index */
  currentMatchIndex: number;
}

/**
 * Search match result
 */
export interface VimSearchMatch {
  /** Line number (0-indexed) */
  line: number;
  /** Column start */
  start: number;
  /** Column end */
  end: number;
}

/**
 * Vim command parsed result
 */
export interface VimCommand {
  /** Command name */
  name: string;
  /** Command arguments */
  args: string[];
  /** Full command string */
  raw: string;
}

/**
 * Vim command handler
 */
export interface VimCommandHandler {
  /** Command name or alias */
  name: string;
  /** Aliases for the command */
  aliases?: string[];
  /** Description */
  description: string;
  /** Handler function */
  execute: (args: string[]) => void | Promise<void>;
}

/**
 * Vim configuration
 */
export interface VimConfig {
  /** Whether vim mode is enabled by default */
  enabled: boolean;
  /** Whether to start in normal mode */
  startInNormalMode: boolean;
  /** Custom key bindings (override defaults) */
  customBindings?: VimKeyBinding[];
  /** Whether to show mode indicator */
  showModeIndicator: boolean;
  /** Search highlights enabled */
  searchHighlights: boolean;
}

/**
 * Vim mode change event
 */
export interface VimModeChangeEvent {
  previousMode: VimMode;
  newMode: VimMode;
  timestamp: number;
}

/**
 * Vim key event result
 */
export interface VimKeyEventResult {
  /** Whether the key was handled */
  handled: boolean;
  /** Action that was executed */
  action?: VimAction;
  /** Whether to prevent default handling */
  preventDefault: boolean;
  /** Mode change if any */
  modeChange?: VimModeChangeEvent;
}
