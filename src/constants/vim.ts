/**
 * Vim Mode Constants
 *
 * Constants for vim-style navigation and editing
 */

import type { VimMode, VimKeyBinding, VimConfig } from "@/types/vim";

/**
 * Mode labels for display
 */
export const VIM_MODE_LABELS: Record<VimMode, string> = {
  normal: "NORMAL",
  insert: "INSERT",
  command: "COMMAND",
  visual: "VISUAL",
};

/**
 * Mode colors for display
 */
export const VIM_MODE_COLORS: Record<VimMode, string> = {
  normal: "blue",
  insert: "green",
  command: "yellow",
  visual: "magenta",
};

/**
 * Mode hints for status line
 */
export const VIM_MODE_HINTS: Record<VimMode, string> = {
  normal: "j/k scroll, i insert, : command",
  insert: "Esc to normal",
  command: "Enter to execute, Esc to cancel",
  visual: "y yank, d delete, Esc cancel",
};

/**
 * Default key bindings
 */
export const VIM_DEFAULT_BINDINGS: VimKeyBinding[] = [
  // Normal mode - Navigation
  {
    key: "j",
    mode: "normal",
    action: "scroll_down",
    description: "Scroll down",
  },
  { key: "k", mode: "normal", action: "scroll_up", description: "Scroll up" },
  {
    key: "d",
    mode: "normal",
    action: "scroll_half_down",
    ctrl: true,
    description: "Half page down",
  },
  {
    key: "u",
    mode: "normal",
    action: "scroll_half_up",
    ctrl: true,
    description: "Half page up",
  },
  {
    key: "g",
    mode: "normal",
    action: "goto_top",
    description: "Go to top (gg)",
  },
  {
    key: "G",
    mode: "normal",
    action: "goto_bottom",
    shift: true,
    description: "Go to bottom",
  },

  // Normal mode - Mode switching
  {
    key: "i",
    mode: "normal",
    action: "enter_insert",
    description: "Enter insert mode",
  },
  {
    key: "a",
    mode: "normal",
    action: "enter_insert",
    description: "Append (enter insert)",
  },
  {
    key: ":",
    mode: "normal",
    action: "enter_command",
    description: "Enter command mode",
  },
  {
    key: "v",
    mode: "normal",
    action: "enter_visual",
    description: "Enter visual mode",
  },

  // Normal mode - Search
  {
    key: "/",
    mode: "normal",
    action: "search_start",
    description: "Start search",
  },
  {
    key: "n",
    mode: "normal",
    action: "search_next",
    description: "Next search match",
  },
  {
    key: "N",
    mode: "normal",
    action: "search_prev",
    shift: true,
    description: "Previous search match",
  },

  // Normal mode - Word navigation
  {
    key: "w",
    mode: "normal",
    action: "word_forward",
    description: "Next word",
  },
  {
    key: "b",
    mode: "normal",
    action: "word_backward",
    description: "Previous word",
  },
  { key: "0", mode: "normal", action: "line_start", description: "Line start" },
  { key: "$", mode: "normal", action: "line_end", description: "Line end" },

  // Normal mode - Edit operations
  { key: "y", mode: "normal", action: "yank", description: "Yank (copy)" },
  { key: "p", mode: "normal", action: "paste", description: "Paste" },
  { key: "u", mode: "normal", action: "undo", description: "Undo" },
  { key: "r", mode: "normal", action: "redo", ctrl: true, description: "Redo" },

  // Insert mode
  {
    key: "escape",
    mode: "insert",
    action: "exit_mode",
    description: "Exit to normal mode",
  },

  // Command mode
  {
    key: "escape",
    mode: "command",
    action: "cancel",
    description: "Cancel command",
  },
  {
    key: "return",
    mode: "command",
    action: "execute_command",
    description: "Execute command",
  },

  // Visual mode
  {
    key: "escape",
    mode: "visual",
    action: "exit_mode",
    description: "Exit visual mode",
  },
  { key: "y", mode: "visual", action: "yank", description: "Yank selection" },
  {
    key: "d",
    mode: "visual",
    action: "delete",
    description: "Delete selection",
  },
];

/**
 * Vim commands (: commands)
 */
export const VIM_COMMANDS = {
  QUIT: "q",
  QUIT_FORCE: "q!",
  WRITE: "w",
  WRITE_QUIT: "wq",
  HELP: "help",
  SET: "set",
  NOHL: "nohl",
  SEARCH: "/",
} as const;

/**
 * Vim command aliases
 */
export const VIM_COMMAND_ALIASES: Record<string, string> = {
  quit: "q",
  exit: "q",
  write: "w",
  save: "w",
  wq: "wq",
  x: "wq",
};

/**
 * Default vim configuration
 */
export const DEFAULT_VIM_CONFIG: VimConfig = {
  enabled: true,
  startInNormalMode: true,
  showModeIndicator: true,
  searchHighlights: true,
};

/**
 * Scroll amounts
 */
export const VIM_SCROLL_AMOUNTS = {
  /** Lines to scroll with j/k */
  LINE: 1,
  /** Lines to scroll with Ctrl+d/u */
  HALF_PAGE: 10,
  /** Lines to scroll with Ctrl+f/b */
  FULL_PAGE: 20,
} as const;

/**
 * Settings key in config
 */
export const VIM_SETTINGS_KEY = "vim";

/**
 * Escape key codes
 */
export const ESCAPE_KEYS = ["escape", "\x1b", "\u001b"];

/**
 * Special key names
 */
export const SPECIAL_KEYS = {
  ESCAPE: "escape",
  RETURN: "return",
  BACKSPACE: "backspace",
  DELETE: "delete",
  TAB: "tab",
  SPACE: "space",
} as const;
