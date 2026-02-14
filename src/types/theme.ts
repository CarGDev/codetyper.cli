/**
 * Theme Type Definitions
 *
 * Defines the structure for TUI color themes
 */

export interface ThemeColors {
  // Primary UI colors
  primary: string;
  secondary: string;
  accent: string;

  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;

  // Text colors
  text: string;
  textDim: string;
  textMuted: string;

  // Background colors (optional with fallbacks in components)
  background?: string;
  backgroundPanel?: string;
  backgroundElement?: string;

  // Border colors
  border: string;
  borderFocus: string;
  borderWarning: string;
  borderModal: string;

  // Background colors (for highlights)
  bgHighlight: string;
  bgCursor: string;
  bgAdded: string;
  bgRemoved: string;

  // Diff colors
  diffAdded: string;
  diffRemoved: string;
  diffContext: string;
  diffHeader: string;
  diffHunk: string;
  // Diff line backgrounds (darker/muted for readability)
  diffLineBgAdded: string;
  diffLineBgRemoved: string;
  diffLineText: string;

  // Role colors
  roleUser: string;
  roleAssistant: string;
  roleSystem: string;
  roleTool: string;

  // Mode colors
  modeIdle: string;
  modeEditing: string;
  modeThinking: string;
  modeToolExecution: string;
  modePermission: string;

  // Tool status colors
  toolPending: string;
  toolRunning: string;
  toolSuccess: string;
  toolError: string;

  // Header gradient
  headerGradient: string[];
}

export interface Theme {
  name: string;
  displayName: string;
  colors: ThemeColors;
}

export type ThemeName =
  | "default"
  | "dracula"
  | "nord"
  | "tokyo-night"
  | "gruvbox"
  | "monokai"
  | "solarized-dark"
  | "one-dark"
  | "catppuccin"
  | "github-dark"
  | "rose-pine"
  | "kanagawa"
  | "ayu-dark"
  | "cargdev-cyberpunk"
  | "pink-purple"
  | "custom";
