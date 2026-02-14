/**
 * Keybind Configuration
 *
 * Defines all configurable keybindings with defaults.
 * Modeled after OpenCode's keybind system with leader key support,
 * comma-separated alternatives, and `<leader>` prefix expansion.
 *
 * Format: "mod+key" or "mod+key,mod+key" for alternatives
 * Special: "<leader>key" expands to "${leader}+key"
 * "none" disables the binding
 */

// ============================================================================
// Keybind Action IDs
// ============================================================================

/**
 * All possible keybind action identifiers.
 * These map 1:1 to the defaults below.
 */
export type KeybindAction =
  // Application
  | "app_exit"
  | "app_interrupt"

  // Session / execution
  | "session_interrupt"
  | "session_abort_rollback"
  | "session_pause_resume"
  | "session_step_toggle"
  | "session_step_advance"

  // Navigation & scrolling
  | "messages_page_up"
  | "messages_page_down"

  // Mode switching
  | "mode_toggle"

  // Input area
  | "input_submit"
  | "input_newline"
  | "input_clear"
  | "input_paste"

  // Menus & pickers
  | "command_menu"
  | "file_picker"
  | "model_list"
  | "theme_list"
  | "agent_list"
  | "help_menu"

  // Clipboard
  | "clipboard_copy"

  // Sidebar / panels
  | "sidebar_toggle"
  | "activity_toggle";

// ============================================================================
// Default Keybinds
// ============================================================================

/**
 * Default leader key prefix (similar to vim leader or OpenCode's ctrl+x).
 */
export const DEFAULT_LEADER = "ctrl+x";

/**
 * Default keybindings for all actions.
 * Format: comma-separated list of key combos.
 *   - `ctrl+c` — modifier + key
 *   - `escape` — single key
 *   - `<leader>q` — leader prefix + key (expands to e.g. `ctrl+x,q`)
 *   - `none` — binding disabled
 */
export const DEFAULT_KEYBINDS: Readonly<Record<KeybindAction, string>> = {
  // Application
  app_exit: "ctrl+c",
  app_interrupt: "ctrl+c",

  // Session / execution control
  session_interrupt: "escape",
  session_abort_rollback: "ctrl+z",
  session_pause_resume: "ctrl+p",
  session_step_toggle: "ctrl+shift+s",
  session_step_advance: "return",

  // Navigation
  messages_page_up: "pageup",
  messages_page_down: "pagedown",

  // Mode switching
  mode_toggle: "ctrl+e",

  // Input area
  input_submit: "return",
  input_newline: "shift+return,ctrl+return",
  input_clear: "ctrl+c",
  input_paste: "ctrl+v",

  // Menus & pickers
  command_menu: "/",
  file_picker: "@",
  model_list: "<leader>m",
  theme_list: "<leader>t",
  agent_list: "<leader>a",
  help_menu: "<leader>h",

  // Clipboard
  clipboard_copy: "ctrl+y",

  // Sidebar / panels
  sidebar_toggle: "<leader>b",
  activity_toggle: "<leader>s",
} as const;

/**
 * Descriptions for each keybind action (used in help menus)
 */
export const KEYBIND_DESCRIPTIONS: Readonly<Record<KeybindAction, string>> = {
  app_exit: "Exit the application",
  app_interrupt: "Interrupt / abort current action",
  session_interrupt: "Cancel current operation",
  session_abort_rollback: "Abort with rollback",
  session_pause_resume: "Toggle pause/resume execution",
  session_step_toggle: "Toggle step-by-step mode",
  session_step_advance: "Advance one step",
  messages_page_up: "Scroll messages up by one page",
  messages_page_down: "Scroll messages down by one page",
  mode_toggle: "Toggle interaction mode (agent/ask/code-review)",
  input_submit: "Submit input",
  input_newline: "Insert newline in input",
  input_clear: "Clear input field",
  input_paste: "Paste from clipboard",
  command_menu: "Open command menu",
  file_picker: "Open file picker",
  model_list: "List available models",
  theme_list: "List available themes",
  agent_list: "List agents",
  help_menu: "Show help",
  clipboard_copy: "Copy selection to clipboard",
  sidebar_toggle: "Toggle sidebar panel",
  activity_toggle: "Toggle activity/status panel",
} as const;

/**
 * Categories for grouping keybinds in the help menu
 */
export const KEYBIND_CATEGORIES: Readonly<
  Record<string, readonly KeybindAction[]>
> = {
  Application: ["app_exit", "app_interrupt"],
  "Execution Control": [
    "session_interrupt",
    "session_abort_rollback",
    "session_pause_resume",
    "session_step_toggle",
    "session_step_advance",
  ],
  Navigation: ["messages_page_up", "messages_page_down"],
  "Mode & Input": [
    "mode_toggle",
    "input_submit",
    "input_newline",
    "input_clear",
    "input_paste",
  ],
  "Menus & Pickers": [
    "command_menu",
    "file_picker",
    "model_list",
    "theme_list",
    "agent_list",
    "help_menu",
  ],
  Panels: ["sidebar_toggle", "activity_toggle"],
  Clipboard: ["clipboard_copy"],
} as const;
