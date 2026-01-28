/**
 * Home Screen Constants
 * Constants for the welcome/home screen TUI layout
 */

/** Layout constants for home screen */
export const HOME_LAYOUT = {
  maxWidth: 75,
  topPadding: 3,
  bottomPadding: 2,
  horizontalPadding: 2,
  logoGap: 1,
} as const;

/** Input placeholders shown in the prompt box */
export const PLACEHOLDERS = [
  "Fix a TODO in the codebase",
  "What is the tech stack of this project?",
  "Fix broken tests",
  "Explain how this function works",
  "Refactor this code for readability",
  "Add error handling to this function",
];

/** Keyboard hints displayed below the prompt box */
export const KEYBOARD_HINTS = {
  agents: { key: "tab", label: "agents" },
  commands: { key: "ctrl+p", label: "commands" },
} as const;

/** MCP status indicators */
export const MCP_INDICATORS = {
  connected: "⊙",
  error: "⊙",
} as const;
