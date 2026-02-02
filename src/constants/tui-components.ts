/**
 * TUI Component Constants
 *
 * Constants used by TUI components extracted for modularity
 */

import type { SelectOption, SlashCommand } from "@/types/tui";

// ============================================================================
// Header Constants
// ============================================================================

export const TUI_BANNER = [
  "█▀▀ █▀█ █▀▄ █▀▀ ▀█▀ █▄█ █▀█ █▀▀ █▀█",
  "█   █ █ █ █ █▀▀  █   █  █▀▀ █▀▀ █▀▄",
  "▀▀▀ ▀▀▀ ▀▀  ▀▀▀  ▀   ▀  ▀   ▀▀▀ ▀ ▀",
] as const;

export const HEADER_GRADIENT_COLORS = [
  "cyanBright",
  "cyan",
  "blueBright",
] as const;

export type HeaderGradientColor = (typeof HEADER_GRADIENT_COLORS)[number];

// ============================================================================
// Status Bar Mode Display Constants
// ============================================================================

export type ModeDisplayConfig = {
  readonly text: string;
  readonly color: "green" | "cyan" | "magenta" | "yellow";
};

export const MODE_DISPLAY_CONFIG: Record<string, ModeDisplayConfig> = {
  idle: { text: "Ready", color: "green" },
  editing: { text: "Editing", color: "cyan" },
  thinking: { text: "✻ Thinking…", color: "magenta" },
  tool_execution: { text: "✻ Running tool…", color: "yellow" },
  permission_prompt: { text: "Awaiting permission", color: "yellow" },
  command_menu: { text: "Command Menu", color: "cyan" },
  model_select: { text: "Select Model", color: "magenta" },
  agent_select: { text: "Select Agent", color: "magenta" },
  theme_select: { text: "Select Theme", color: "magenta" },
  mcp_select: { text: "MCP Servers", color: "magenta" },
  mode_select: { text: "Select Mode", color: "magenta" },
  provider_select: { text: "Select Provider", color: "magenta" },
  learning_prompt: { text: "Save Learning?", color: "cyan" },
  help_menu: { text: "Help", color: "cyan" },
  help_detail: { text: "Help Detail", color: "cyan" },
  brain_menu: { text: "Brain Settings", color: "magenta" },
  brain_login: { text: "Brain Login", color: "magenta" },
} as const;

export const DEFAULT_MODE_DISPLAY: ModeDisplayConfig = {
  text: "Ready",
  color: "green",
} as const;

// ============================================================================
// Log Panel Constants
// ============================================================================

export const LOG_ENTRY_EXTRA_LINES = {
  user: 2,
  assistant: 2,
  tool: 1,
  toolWithDiff: 10,
  default: 1,
} as const;

export const TOOL_STATUS_ICONS = {
  pending: "○",
  running: "◐",
  success: "✓",
  error: "✗",
} as const;

export const TOOL_STATUS_COLORS = {
  pending: "gray",
  running: "yellow",
  success: "green",
  error: "red",
} as const;

export type ToolStatusColor =
  (typeof TOOL_STATUS_COLORS)[keyof typeof TOOL_STATUS_COLORS];

export const THINKING_SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const;

export const THINKING_SPINNER_INTERVAL = 80;

export const LOG_PANEL_RESERVED_HEIGHT = 15;
export const LOG_PANEL_MIN_HEIGHT = 5;
export const LOG_PANEL_DEFAULT_TERMINAL_HEIGHT = 24;

// ============================================================================
// Permission Modal Constants
// ============================================================================

export const PERMISSION_OPTIONS: SelectOption[] = [
  {
    key: "y",
    label: "Yes (once)",
    value: "once",
    description: "Allow this command only",
  },
  {
    key: "s",
    label: "Yes (session)",
    value: "session",
    description: "Allow pattern for this session",
  },
  {
    key: "l",
    label: "Yes (project)",
    value: "local",
    description: "Allow pattern for this project",
  },
  {
    key: "g",
    label: "Yes (global)",
    value: "global",
    description: "Allow pattern everywhere",
  },
  {
    key: "n",
    label: "No",
    value: "deny",
    description: "Deny this command",
  },
];

export const PERMISSION_TYPE_LABELS = {
  bash: "Execute command",
  read: "Read file",
  write: "Write file",
  edit: "Edit file",
} as const;

// ============================================================================
// Command Menu Constants
// ============================================================================

export const SLASH_COMMANDS: SlashCommand[] = [
  // General commands
  { name: "help", description: "Show available commands", category: "general" },
  {
    name: "clear",
    description: "Clear conversation history",
    category: "general",
  },
  { name: "exit", description: "Exit the chat", category: "general" },

  // Session commands
  { name: "save", description: "Save current session", category: "session" },
  {
    name: "context",
    description: "Show context information",
    category: "session",
  },
  {
    name: "usage",
    description: "Show token usage statistics",
    category: "session",
  },
  {
    name: "remember",
    description: "Save a learning about the project",
    category: "session",
  },
  {
    name: "learnings",
    description: "Show saved learnings",
    category: "session",
  },

  // Settings commands
  { name: "model", description: "Select AI model", category: "settings" },
  { name: "agent", description: "Select agent", category: "settings" },
  { name: "mode", description: "Switch interaction mode", category: "settings" },
  {
    name: "provider",
    description: "Switch LLM provider",
    category: "settings",
  },
  {
    name: "status",
    description: "Show provider status",
    category: "settings",
  },
  { name: "theme", description: "Change color theme", category: "settings" },
  { name: "mcp", description: "Manage MCP servers", category: "settings" },
  { name: "logs", description: "Toggle debug log panel", category: "settings" },

  // Account commands
  {
    name: "whoami",
    description: "Show logged in account",
    category: "account",
  },
  {
    name: "login",
    description: "Authenticate with provider",
    category: "account",
  },
  {
    name: "logout",
    description: "Sign out from provider",
    category: "account",
  },
  {
    name: "brain",
    description: "Configure CodeTyper Brain (memory & knowledge)",
    category: "account",
  },
];

export const COMMAND_CATEGORIES = [
  "general",
  "session",
  "settings",
  "account",
] as const;

export type CommandCategory = (typeof COMMAND_CATEGORIES)[number];

// ============================================================================
// Learning Modal Constants
// ============================================================================

export const LEARNING_OPTIONS: SelectOption[] = [
  {
    key: "y",
    label: "Yes (project)",
    value: "local",
    description: "Save for this project",
  },
  {
    key: "g",
    label: "Yes (global)",
    value: "global",
    description: "Save for all projects",
  },
  {
    key: "n",
    label: "No",
    value: "skip",
    description: "Skip this learning",
  },
];

export const LEARNING_CONTENT_MAX_LENGTH = 100;
export const LEARNING_TRUNCATION_SUFFIX = "...";
