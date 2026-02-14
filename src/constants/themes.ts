/**
 * Built-in Theme Definitions
 *
 * Provides pre-configured color themes for the TUI
 */

import type { Theme, ThemeColors } from "@/types/theme";

const DEFAULT_COLORS: ThemeColors = {
  primary: "#00ffff",
  secondary: "#0088ff",
  accent: "#ff00ff",

  success: "#00ff00",
  error: "#ff0000",
  warning: "#ffff00",
  info: "#00ffff",

  text: "#ffffff",
  textDim: "#808080",
  textMuted: "#666666",

  background: "#0a0a0a",
  backgroundPanel: "#141414",
  backgroundElement: "#1e1e1e",

  border: "#808080",
  borderFocus: "#00ffff",
  borderWarning: "#ffff00",
  borderModal: "#ff00ff",

  bgHighlight: "#00ffff",
  bgCursor: "#00ffff",
  bgAdded: "#00ff88",
  bgRemoved: "#ff4444",

  diffAdded: "#00ff00",
  diffRemoved: "#ff0000",
  diffContext: "#808080",
  diffHeader: "#ffffff",
  diffHunk: "#00ffff",
  diffLineBgAdded: "#1a3d1a",
  diffLineBgRemoved: "#3d1a1a",
  diffLineText: "#ffffff",

  roleUser: "#00ffff",
  roleAssistant: "#00ff00",
  roleSystem: "#ffff00",
  roleTool: "#ffff00",

  modeIdle: "#00ff00",
  modeEditing: "#00ffff",
  modeThinking: "#ff00ff",
  modeToolExecution: "#ffff00",
  modePermission: "#ffff00",

  toolPending: "#808080",
  toolRunning: "#ffff00",
  toolSuccess: "#00ff00",
  toolError: "#ff0000",

  headerGradient: ["#00ffff", "#00dddd", "#0088ff"],
};

const DRACULA_COLORS: ThemeColors = {
  primary: "#bd93f9",
  secondary: "#6272a4",
  accent: "#ff79c6",

  success: "#50fa7b",
  error: "#ff5555",
  warning: "#f1fa8c",
  info: "#8be9fd",

  text: "#f8f8f2",
  textDim: "#6272a4",
  textMuted: "#44475a",

  background: "#282a36",
  backgroundPanel: "#21222c",
  backgroundElement: "#343746",

  border: "#44475a",
  borderFocus: "#bd93f9",
  borderWarning: "#f1fa8c",
  borderModal: "#ff79c6",

  bgHighlight: "#44475a",
  bgCursor: "#bd93f9",
  bgAdded: "#50fa7b",
  bgRemoved: "#ff5555",

  diffAdded: "#50fa7b",
  diffRemoved: "#ff5555",
  diffContext: "#6272a4",
  diffHeader: "#f8f8f2",
  diffHunk: "#8be9fd",
  diffLineBgAdded: "#1a3d2a",
  diffLineBgRemoved: "#3d1a2a",
  diffLineText: "#f8f8f2",

  roleUser: "#8be9fd",
  roleAssistant: "#50fa7b",
  roleSystem: "#f1fa8c",
  roleTool: "#ffb86c",

  modeIdle: "#50fa7b",
  modeEditing: "#8be9fd",
  modeThinking: "#bd93f9",
  modeToolExecution: "#f1fa8c",
  modePermission: "#ffb86c",

  toolPending: "#6272a4",
  toolRunning: "#f1fa8c",
  toolSuccess: "#50fa7b",
  toolError: "#ff5555",

  headerGradient: ["#bd93f9", "#ff79c6", "#8be9fd"],
};

const NORD_COLORS: ThemeColors = {
  primary: "#88c0d0",
  secondary: "#5e81ac",
  accent: "#b48ead",

  success: "#a3be8c",
  error: "#bf616a",
  warning: "#ebcb8b",
  info: "#88c0d0",

  text: "#eceff4",
  textDim: "#4c566a",
  textMuted: "#3b4252",

  background: "#2e3440",
  backgroundPanel: "#3b4252",
  backgroundElement: "#434c5e",

  border: "#3b4252",
  borderFocus: "#88c0d0",
  borderWarning: "#ebcb8b",
  borderModal: "#b48ead",

  bgHighlight: "#3b4252",
  bgCursor: "#88c0d0",
  bgAdded: "#a3be8c",
  bgRemoved: "#bf616a",

  diffAdded: "#a3be8c",
  diffRemoved: "#bf616a",
  diffContext: "#4c566a",
  diffHeader: "#eceff4",
  diffHunk: "#81a1c1",
  diffLineBgAdded: "#2e3d35",
  diffLineBgRemoved: "#3d2e35",
  diffLineText: "#eceff4",

  roleUser: "#88c0d0",
  roleAssistant: "#a3be8c",
  roleSystem: "#ebcb8b",
  roleTool: "#d08770",

  modeIdle: "#a3be8c",
  modeEditing: "#88c0d0",
  modeThinking: "#b48ead",
  modeToolExecution: "#ebcb8b",
  modePermission: "#d08770",

  toolPending: "#4c566a",
  toolRunning: "#ebcb8b",
  toolSuccess: "#a3be8c",
  toolError: "#bf616a",

  headerGradient: ["#88c0d0", "#81a1c1", "#5e81ac"],
};

const TOKYO_NIGHT_COLORS: ThemeColors = {
  primary: "#7aa2f7",
  secondary: "#565f89",
  accent: "#bb9af7",

  success: "#9ece6a",
  error: "#f7768e",
  warning: "#e0af68",
  info: "#7dcfff",

  text: "#c0caf5",
  textDim: "#565f89",
  textMuted: "#414868",

  background: "#1a1b26",
  backgroundPanel: "#16161e",
  backgroundElement: "#24283b",

  border: "#414868",
  borderFocus: "#7aa2f7",
  borderWarning: "#e0af68",
  borderModal: "#bb9af7",

  bgHighlight: "#414868",
  bgCursor: "#7aa2f7",
  bgAdded: "#9ece6a",
  bgRemoved: "#f7768e",

  diffAdded: "#9ece6a",
  diffRemoved: "#f7768e",
  diffContext: "#565f89",
  diffHeader: "#c0caf5",
  diffHunk: "#7dcfff",
  diffLineBgAdded: "#1a2d1a",
  diffLineBgRemoved: "#2d1a2a",
  diffLineText: "#c0caf5",

  roleUser: "#7dcfff",
  roleAssistant: "#9ece6a",
  roleSystem: "#e0af68",
  roleTool: "#ff9e64",

  modeIdle: "#9ece6a",
  modeEditing: "#7aa2f7",
  modeThinking: "#bb9af7",
  modeToolExecution: "#e0af68",
  modePermission: "#ff9e64",

  toolPending: "#565f89",
  toolRunning: "#e0af68",
  toolSuccess: "#9ece6a",
  toolError: "#f7768e",

  headerGradient: ["#7aa2f7", "#bb9af7", "#7dcfff"],
};

const GRUVBOX_COLORS: ThemeColors = {
  primary: "#83a598",
  secondary: "#458588",
  accent: "#d3869b",

  success: "#b8bb26",
  error: "#fb4934",
  warning: "#fabd2f",
  info: "#83a598",

  text: "#ebdbb2",
  textDim: "#665c54",
  textMuted: "#504945",

  background: "#282828",
  backgroundPanel: "#1d2021",
  backgroundElement: "#3c3836",

  border: "#504945",
  borderFocus: "#83a598",
  borderWarning: "#fabd2f",
  borderModal: "#d3869b",

  bgHighlight: "#504945",
  bgCursor: "#83a598",
  bgAdded: "#b8bb26",
  bgRemoved: "#fb4934",

  diffAdded: "#b8bb26",
  diffRemoved: "#fb4934",
  diffContext: "#665c54",
  diffHeader: "#ebdbb2",
  diffHunk: "#8ec07c",
  diffLineBgAdded: "#3d3a1a",
  diffLineBgRemoved: "#3d1a1a",
  diffLineText: "#ebdbb2",

  roleUser: "#83a598",
  roleAssistant: "#b8bb26",
  roleSystem: "#fabd2f",
  roleTool: "#fe8019",

  modeIdle: "#b8bb26",
  modeEditing: "#83a598",
  modeThinking: "#d3869b",
  modeToolExecution: "#fabd2f",
  modePermission: "#fe8019",

  toolPending: "#665c54",
  toolRunning: "#fabd2f",
  toolSuccess: "#b8bb26",
  toolError: "#fb4934",

  headerGradient: ["#b8bb26", "#83a598", "#fabd2f"],
};

const MONOKAI_COLORS: ThemeColors = {
  primary: "#66d9ef",
  secondary: "#ae81ff",
  accent: "#f92672",

  success: "#a6e22e",
  error: "#f92672",
  warning: "#e6db74",
  info: "#66d9ef",

  text: "#f8f8f2",
  textDim: "#75715e",
  textMuted: "#49483e",

  background: "#272822",
  backgroundPanel: "#1e1f1c",
  backgroundElement: "#3e3d32",

  border: "#49483e",
  borderFocus: "#66d9ef",
  borderWarning: "#e6db74",
  borderModal: "#ae81ff",

  bgHighlight: "#49483e",
  bgCursor: "#66d9ef",
  bgAdded: "#a6e22e",
  bgRemoved: "#f92672",

  diffAdded: "#a6e22e",
  diffRemoved: "#f92672",
  diffContext: "#75715e",
  diffHeader: "#f8f8f2",
  diffHunk: "#66d9ef",
  diffLineBgAdded: "#2d3d1a",
  diffLineBgRemoved: "#3d1a2a",
  diffLineText: "#f8f8f2",

  roleUser: "#66d9ef",
  roleAssistant: "#a6e22e",
  roleSystem: "#e6db74",
  roleTool: "#fd971f",

  modeIdle: "#a6e22e",
  modeEditing: "#66d9ef",
  modeThinking: "#ae81ff",
  modeToolExecution: "#e6db74",
  modePermission: "#fd971f",

  toolPending: "#75715e",
  toolRunning: "#e6db74",
  toolSuccess: "#a6e22e",
  toolError: "#f92672",

  headerGradient: ["#a6e22e", "#66d9ef", "#ae81ff"],
};

const CATPPUCCIN_COLORS: ThemeColors = {
  primary: "#89b4fa",
  secondary: "#74c7ec",
  accent: "#cba6f7",

  success: "#a6e3a1",
  error: "#f38ba8",
  warning: "#f9e2af",
  info: "#89dceb",

  text: "#cdd6f4",
  textDim: "#6c7086",
  textMuted: "#45475a",

  background: "#1e1e2e",
  backgroundPanel: "#181825",
  backgroundElement: "#313244",

  border: "#45475a",
  borderFocus: "#89b4fa",
  borderWarning: "#f9e2af",
  borderModal: "#cba6f7",

  bgHighlight: "#45475a",
  bgCursor: "#89b4fa",
  bgAdded: "#a6e3a1",
  bgRemoved: "#f38ba8",

  diffAdded: "#a6e3a1",
  diffRemoved: "#f38ba8",
  diffContext: "#6c7086",
  diffHeader: "#cdd6f4",
  diffHunk: "#89dceb",
  diffLineBgAdded: "#1a3d2a",
  diffLineBgRemoved: "#3d1a2a",
  diffLineText: "#cdd6f4",

  roleUser: "#89dceb",
  roleAssistant: "#a6e3a1",
  roleSystem: "#f9e2af",
  roleTool: "#fab387",

  modeIdle: "#a6e3a1",
  modeEditing: "#89b4fa",
  modeThinking: "#cba6f7",
  modeToolExecution: "#f9e2af",
  modePermission: "#fab387",

  toolPending: "#6c7086",
  toolRunning: "#f9e2af",
  toolSuccess: "#a6e3a1",
  toolError: "#f38ba8",

  headerGradient: ["#89b4fa", "#cba6f7", "#f5c2e7"],
};

const ONE_DARK_COLORS: ThemeColors = {
  primary: "#61afef",
  secondary: "#528bff",
  accent: "#c678dd",

  success: "#98c379",
  error: "#e06c75",
  warning: "#e5c07b",
  info: "#56b6c2",

  text: "#abb2bf",
  textDim: "#5c6370",
  textMuted: "#3e4451",

  background: "#282c34",
  backgroundPanel: "#21252b",
  backgroundElement: "#2c323c",

  border: "#3e4451",
  borderFocus: "#61afef",
  borderWarning: "#e5c07b",
  borderModal: "#c678dd",

  bgHighlight: "#3e4451",
  bgCursor: "#61afef",
  bgAdded: "#98c379",
  bgRemoved: "#e06c75",

  diffAdded: "#98c379",
  diffRemoved: "#e06c75",
  diffContext: "#5c6370",
  diffHeader: "#abb2bf",
  diffHunk: "#56b6c2",
  diffLineBgAdded: "#2a3d2a",
  diffLineBgRemoved: "#3d2a2a",
  diffLineText: "#abb2bf",

  roleUser: "#56b6c2",
  roleAssistant: "#98c379",
  roleSystem: "#e5c07b",
  roleTool: "#d19a66",

  modeIdle: "#98c379",
  modeEditing: "#61afef",
  modeThinking: "#c678dd",
  modeToolExecution: "#e5c07b",
  modePermission: "#d19a66",

  toolPending: "#5c6370",
  toolRunning: "#e5c07b",
  toolSuccess: "#98c379",
  toolError: "#e06c75",

  headerGradient: ["#61afef", "#c678dd", "#56b6c2"],
};

const SOLARIZED_DARK_COLORS: ThemeColors = {
  primary: "#268bd2",
  secondary: "#2aa198",
  accent: "#6c71c4",

  success: "#859900",
  error: "#dc322f",
  warning: "#b58900",
  info: "#2aa198",

  text: "#839496",
  textDim: "#586e75",
  textMuted: "#073642",

  background: "#002b36",
  backgroundPanel: "#001f27",
  backgroundElement: "#073642",

  border: "#073642",
  borderFocus: "#268bd2",
  borderWarning: "#b58900",
  borderModal: "#6c71c4",

  bgHighlight: "#073642",
  bgCursor: "#268bd2",
  bgAdded: "#859900",
  bgRemoved: "#dc322f",

  diffAdded: "#859900",
  diffRemoved: "#dc322f",
  diffContext: "#586e75",
  diffHeader: "#93a1a1",
  diffHunk: "#2aa198",
  diffLineBgAdded: "#0a2a1a",
  diffLineBgRemoved: "#2a0a1a",
  diffLineText: "#93a1a1",

  roleUser: "#2aa198",
  roleAssistant: "#859900",
  roleSystem: "#b58900",
  roleTool: "#cb4b16",

  modeIdle: "#859900",
  modeEditing: "#268bd2",
  modeThinking: "#6c71c4",
  modeToolExecution: "#b58900",
  modePermission: "#cb4b16",

  toolPending: "#586e75",
  toolRunning: "#b58900",
  toolSuccess: "#859900",
  toolError: "#dc322f",

  headerGradient: ["#268bd2", "#2aa198", "#859900"],
};

const GITHUB_DARK_COLORS: ThemeColors = {
  primary: "#58a6ff",
  secondary: "#388bfd",
  accent: "#a371f7",

  success: "#3fb950",
  error: "#f85149",
  warning: "#d29922",
  info: "#58a6ff",

  text: "#c9d1d9",
  textDim: "#8b949e",
  textMuted: "#484f58",

  background: "#0d1117",
  backgroundPanel: "#010409",
  backgroundElement: "#161b22",

  border: "#30363d",
  borderFocus: "#58a6ff",
  borderWarning: "#d29922",
  borderModal: "#a371f7",

  bgHighlight: "#161b22",
  bgCursor: "#58a6ff",
  bgAdded: "#238636",
  bgRemoved: "#da3633",

  diffAdded: "#3fb950",
  diffRemoved: "#f85149",
  diffContext: "#8b949e",
  diffHeader: "#c9d1d9",
  diffHunk: "#58a6ff",
  diffLineBgAdded: "#0d2818",
  diffLineBgRemoved: "#2d0d0d",
  diffLineText: "#c9d1d9",

  roleUser: "#58a6ff",
  roleAssistant: "#3fb950",
  roleSystem: "#d29922",
  roleTool: "#f0883e",

  modeIdle: "#3fb950",
  modeEditing: "#58a6ff",
  modeThinking: "#a371f7",
  modeToolExecution: "#d29922",
  modePermission: "#f0883e",

  toolPending: "#8b949e",
  toolRunning: "#d29922",
  toolSuccess: "#3fb950",
  toolError: "#f85149",

  headerGradient: ["#58a6ff", "#a371f7", "#3fb950"],
};

const ROSE_PINE_COLORS: ThemeColors = {
  primary: "#c4a7e7",
  secondary: "#9ccfd8",
  accent: "#ebbcba",

  success: "#31748f",
  error: "#eb6f92",
  warning: "#f6c177",
  info: "#9ccfd8",

  text: "#e0def4",
  textDim: "#6e6a86",
  textMuted: "#26233a",

  background: "#191724",
  backgroundPanel: "#1f1d2e",
  backgroundElement: "#26233a",

  border: "#26233a",
  borderFocus: "#c4a7e7",
  borderWarning: "#f6c177",
  borderModal: "#ebbcba",

  bgHighlight: "#21202e",
  bgCursor: "#c4a7e7",
  bgAdded: "#31748f",
  bgRemoved: "#eb6f92",

  diffAdded: "#31748f",
  diffRemoved: "#eb6f92",
  diffContext: "#6e6a86",
  diffHeader: "#e0def4",
  diffHunk: "#9ccfd8",
  diffLineBgAdded: "#1a2a3d",
  diffLineBgRemoved: "#3d1a2a",
  diffLineText: "#e0def4",

  roleUser: "#9ccfd8",
  roleAssistant: "#31748f",
  roleSystem: "#f6c177",
  roleTool: "#ebbcba",

  modeIdle: "#31748f",
  modeEditing: "#c4a7e7",
  modeThinking: "#ebbcba",
  modeToolExecution: "#f6c177",
  modePermission: "#eb6f92",

  toolPending: "#6e6a86",
  toolRunning: "#f6c177",
  toolSuccess: "#31748f",
  toolError: "#eb6f92",

  headerGradient: ["#c4a7e7", "#ebbcba", "#9ccfd8"],
};

const KANAGAWA_COLORS: ThemeColors = {
  primary: "#7e9cd8",
  secondary: "#7fb4ca",
  accent: "#957fb8",

  success: "#98bb6c",
  error: "#c34043",
  warning: "#dca561",
  info: "#7fb4ca",

  text: "#dcd7ba",
  textDim: "#727169",
  textMuted: "#363646",

  background: "#1f1f28",
  backgroundPanel: "#181820",
  backgroundElement: "#2a2a37",

  border: "#363646",
  borderFocus: "#7e9cd8",
  borderWarning: "#dca561",
  borderModal: "#957fb8",

  bgHighlight: "#2a2a37",
  bgCursor: "#7e9cd8",
  bgAdded: "#76946a",
  bgRemoved: "#c34043",

  diffAdded: "#98bb6c",
  diffRemoved: "#c34043",
  diffContext: "#727169",
  diffHeader: "#dcd7ba",
  diffHunk: "#7fb4ca",
  diffLineBgAdded: "#2a3d2a",
  diffLineBgRemoved: "#3d2a2a",
  diffLineText: "#dcd7ba",

  roleUser: "#7fb4ca",
  roleAssistant: "#98bb6c",
  roleSystem: "#dca561",
  roleTool: "#ffa066",

  modeIdle: "#98bb6c",
  modeEditing: "#7e9cd8",
  modeThinking: "#957fb8",
  modeToolExecution: "#dca561",
  modePermission: "#ffa066",

  toolPending: "#727169",
  toolRunning: "#dca561",
  toolSuccess: "#98bb6c",
  toolError: "#c34043",

  headerGradient: ["#7e9cd8", "#957fb8", "#7fb4ca"],
};

const AYU_DARK_COLORS: ThemeColors = {
  primary: "#39bae6",
  secondary: "#59c2ff",
  accent: "#d2a6ff",

  success: "#7fd962",
  error: "#f07178",
  warning: "#ffb454",
  info: "#59c2ff",

  text: "#bfbdb6",
  textDim: "#636e78",
  textMuted: "#232834",

  background: "#0a0e14",
  backgroundPanel: "#0d1016",
  backgroundElement: "#1a1f29",

  border: "#232834",
  borderFocus: "#39bae6",
  borderWarning: "#ffb454",
  borderModal: "#d2a6ff",

  bgHighlight: "#1a1f29",
  bgCursor: "#39bae6",
  bgAdded: "#7fd962",
  bgRemoved: "#f07178",

  diffAdded: "#7fd962",
  diffRemoved: "#f07178",
  diffContext: "#636e78",
  diffHeader: "#bfbdb6",
  diffHunk: "#59c2ff",
  diffLineBgAdded: "#1a3d1a",
  diffLineBgRemoved: "#3d1a1a",
  diffLineText: "#bfbdb6",

  roleUser: "#59c2ff",
  roleAssistant: "#7fd962",
  roleSystem: "#ffb454",
  roleTool: "#ff8f40",

  modeIdle: "#7fd962",
  modeEditing: "#39bae6",
  modeThinking: "#d2a6ff",
  modeToolExecution: "#ffb454",
  modePermission: "#ff8f40",

  toolPending: "#636e78",
  toolRunning: "#ffb454",
  toolSuccess: "#7fd962",
  toolError: "#f07178",

  headerGradient: ["#39bae6", "#d2a6ff", "#7fd962"],
};

const CARGDEV_CYBERPUNK_COLORS: ThemeColors = {
  primary: "#8be9fd",
  secondary: "#bd93f9",
  accent: "#ff79c6",

  success: "#50fa7b",
  error: "#ff5555",
  warning: "#ffb86c",
  info: "#8be9fd",

  text: "#e0e0e0",
  textDim: "#666666",
  textMuted: "#44475a",

  background: "#0d1926",
  backgroundPanel: "#071018",
  backgroundElement: "#112233",

  border: "#003b46",
  borderFocus: "#8be9fd",
  borderWarning: "#ffb86c",
  borderModal: "#ff79c6",

  bgHighlight: "#112233",
  bgCursor: "#ff79c6",
  bgAdded: "#50fa7b",
  bgRemoved: "#ff5555",

  diffAdded: "#50fa7b",
  diffRemoved: "#ff5555",
  diffContext: "#666666",
  diffHeader: "#f8f8f2",
  diffHunk: "#8be9fd",
  diffLineBgAdded: "#0d2a1a",
  diffLineBgRemoved: "#2a0d1a",
  diffLineText: "#f8f8f2",

  roleUser: "#8be9fd",
  roleAssistant: "#50fa7b",
  roleSystem: "#ffb86c",
  roleTool: "#bd93f9",

  modeIdle: "#50fa7b",
  modeEditing: "#8be9fd",
  modeThinking: "#ff79c6",
  modeToolExecution: "#ffb86c",
  modePermission: "#bd93f9",

  toolPending: "#666666",
  toolRunning: "#ffb86c",
  toolSuccess: "#50fa7b",
  toolError: "#ff5555",

  headerGradient: ["#ff79c6", "#bd93f9", "#8be9fd"],
};

const PINK_PURPLE_COLORS: ThemeColors = {
  primary: "#ff69b4",
  secondary: "#b47ee5",
  accent: "#e84393",

  success: "#a3e048",
  error: "#ff4757",
  warning: "#ffa502",
  info: "#cf6fef",

  text: "#f5e6f0",
  textDim: "#9a7aa0",
  textMuted: "#4a3050",

  background: "#1a0a20",
  backgroundPanel: "#120818",
  backgroundElement: "#2a1535",

  border: "#3d1f4e",
  borderFocus: "#ff69b4",
  borderWarning: "#ffa502",
  borderModal: "#b47ee5",

  bgHighlight: "#2a1535",
  bgCursor: "#e84393",
  bgAdded: "#a3e048",
  bgRemoved: "#ff4757",

  diffAdded: "#a3e048",
  diffRemoved: "#ff4757",
  diffContext: "#9a7aa0",
  diffHeader: "#f5e6f0",
  diffHunk: "#cf6fef",
  diffLineBgAdded: "#1a2d1a",
  diffLineBgRemoved: "#2d1a1a",
  diffLineText: "#f5e6f0",

  roleUser: "#ff69b4",
  roleAssistant: "#b47ee5",
  roleSystem: "#ffa502",
  roleTool: "#cf6fef",

  modeIdle: "#b47ee5",
  modeEditing: "#ff69b4",
  modeThinking: "#e84393",
  modeToolExecution: "#ffa502",
  modePermission: "#cf6fef",

  toolPending: "#9a7aa0",
  toolRunning: "#ffa502",
  toolSuccess: "#a3e048",
  toolError: "#ff4757",

  headerGradient: ["#ff69b4", "#e84393", "#b47ee5"],
};

export const THEMES: Record<string, Theme> = {
  default: {
    name: "default",
    displayName: "Default",
    colors: DEFAULT_COLORS,
  },
  dracula: {
    name: "dracula",
    displayName: "Dracula",
    colors: DRACULA_COLORS,
  },
  nord: {
    name: "nord",
    displayName: "Nord",
    colors: NORD_COLORS,
  },
  "tokyo-night": {
    name: "tokyo-night",
    displayName: "Tokyo Night",
    colors: TOKYO_NIGHT_COLORS,
  },
  gruvbox: {
    name: "gruvbox",
    displayName: "Gruvbox",
    colors: GRUVBOX_COLORS,
  },
  monokai: {
    name: "monokai",
    displayName: "Monokai",
    colors: MONOKAI_COLORS,
  },
  catppuccin: {
    name: "catppuccin",
    displayName: "Catppuccin Mocha",
    colors: CATPPUCCIN_COLORS,
  },
  "one-dark": {
    name: "one-dark",
    displayName: "One Dark",
    colors: ONE_DARK_COLORS,
  },
  "solarized-dark": {
    name: "solarized-dark",
    displayName: "Solarized Dark",
    colors: SOLARIZED_DARK_COLORS,
  },
  "github-dark": {
    name: "github-dark",
    displayName: "GitHub Dark",
    colors: GITHUB_DARK_COLORS,
  },
  "rose-pine": {
    name: "rose-pine",
    displayName: "Rosé Pine",
    colors: ROSE_PINE_COLORS,
  },
  kanagawa: {
    name: "kanagawa",
    displayName: "Kanagawa",
    colors: KANAGAWA_COLORS,
  },
  "ayu-dark": {
    name: "ayu-dark",
    displayName: "Ayu Dark",
    colors: AYU_DARK_COLORS,
  },
  "cargdev-cyberpunk": {
    name: "cargdev-cyberpunk",
    displayName: "Cargdev Cyberpunk",
    colors: CARGDEV_CYBERPUNK_COLORS,
  },
  "pink-purple": {
    name: "pink-purple",
    displayName: "Pink Purple",
    colors: PINK_PURPLE_COLORS,
  },
};

export const THEME_NAMES = Object.keys(THEMES);

export const DEFAULT_THEME = "default";

export const getTheme = (name: string): Theme => {
  return THEMES[name] ?? THEMES[DEFAULT_THEME];
};

export const getThemeNames = (): string[] => {
  return THEME_NAMES;
};
