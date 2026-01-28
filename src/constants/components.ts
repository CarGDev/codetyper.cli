/**
 * UI component constants
 */

// Box drawing characters
export const BoxChars = {
  // Single line
  single: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    leftT: "├",
    rightT: "┤",
    topT: "┬",
    bottomT: "┴",
    cross: "┼",
  },
  // Double line
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
    leftT: "╠",
    rightT: "╣",
    topT: "╦",
    bottomT: "╩",
    cross: "╬",
  },
  // Rounded
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    leftT: "├",
    rightT: "┤",
    topT: "┬",
    bottomT: "┴",
    cross: "┼",
  },
  // Bold
  bold: {
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",
    leftT: "┣",
    rightT: "┫",
    topT: "┳",
    bottomT: "┻",
    cross: "╋",
  },
} as const;

// Default box options
export const BOX_DEFAULTS = {
  style: "rounded" as const,
  padding: 1,
  align: "left" as const,
} as const;

// Tool icon mapping
export const TOOL_ICONS = {
  bash: "bash",
  read: "read",
  write: "write",
  edit: "edit",
  default: "default",
} as const;

// State color mapping
export const STATE_COLORS = {
  pending: "DIM",
  running: "primary",
  success: "success",
  error: "error",
} as const;

// Role configuration for message display
export const ROLE_CONFIG = {
  user: { label: "You", colorKey: "primary" },
  assistant: { label: "CodeTyper", colorKey: "success" },
  system: { label: "System", colorKey: "textMuted" },
  tool: { label: "Tool", colorKey: "warning" },
} as const;

// Status indicator configuration
export const STATUS_INDICATORS = {
  success: { iconKey: "success", colorKey: "success" },
  error: { iconKey: "error", colorKey: "error" },
  warning: { iconKey: "warning", colorKey: "warning" },
  info: { iconKey: "info", colorKey: "info" },
  pending: { iconKey: "pending", colorKey: "textMuted" },
  running: { iconKey: "running", colorKey: "primary" },
} as const;

// Tool call icon configuration
export const TOOL_CALL_ICONS = {
  bash: { iconKey: "bash", colorKey: "warning" },
  read: { iconKey: "read", colorKey: "info" },
  write: { iconKey: "write", colorKey: "success" },
  edit: { iconKey: "edit", colorKey: "primary" },
  default: { iconKey: "gear", colorKey: "textMuted" },
} as const;
