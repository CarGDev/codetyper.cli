/**
 * Dashboard Constants
 */

export const DASHBOARD_TITLE = "CodeTyper";

export const DASHBOARD_LAYOUT = {
  DEFAULT_WIDTH: 120,
  CONTENT_HEIGHT: 15,
  LEFT_COLUMN_RATIO: 0.35,
  PADDING: 3,
} as const;

export const DASHBOARD_LOGO = [
  "   ██████╗███████╗",
  "  ██╔════╝██╔════╝",
  "  ██║     ███████╗",
  "  ██║     ╚════██║",
  "  ╚██████╗███████║",
  "   ╚═════╝╚══════╝",
] as const;

export const DASHBOARD_COMMANDS = [
  { command: "codetyper chat", description: "Start interactive chat" },
  { command: "codetyper run <task>", description: "Execute autonomous task" },
  { command: "/help", description: "Show all commands in chat" },
] as const;

export const DASHBOARD_QUICK_COMMANDS = [
  { command: "codetyper chat", description: "Start interactive chat" },
  { command: "codetyper run", description: "Execute autonomous task" },
  { command: "codetyper --help", description: "Show all commands" },
] as const;

export const DASHBOARD_BORDER = {
  TOP_LEFT: "╭",
  TOP_RIGHT: "╮",
  BOTTOM_LEFT: "╰",
  BOTTOM_RIGHT: "╯",
  HORIZONTAL: "─",
  VERTICAL: "│",
} as const;
