/**
 * Tips and shortcuts constants for CodeTyper CLI
 */

// Tips with {highlight}text{/highlight} markers
export const TIPS = [
  "Type {highlight}@filename{/highlight} to add a file to context",
  "Use {highlight}/help{/highlight} to see all available commands",
  "Press {highlight}/clear{/highlight} to start a fresh conversation",
  "Use {highlight}--yes{/highlight} or {highlight}-y{/highlight} to auto-approve all commands",
  "Add {highlight}--verbose{/highlight} to see detailed tool execution",
  "Use {highlight}/models{/highlight} to see available models",
  "Type {highlight}/provider{/highlight} to switch LLM providers",
  "Files are automatically added to context with {highlight}@src/*.ts{/highlight} globs",
  "Use {highlight}/save{/highlight} to save your session",
  "Resume sessions with {highlight}-r{/highlight} or {highlight}--resume{/highlight}",
  "Use {highlight}-c{/highlight} to continue your last session",
  "Print mode {highlight}-p{/highlight} outputs response and exits",
  "Permission patterns like {highlight}Bash(git:*){/highlight} auto-approve commands",
  "Use {highlight}codetyper permissions ls{/highlight} to see allowed patterns",
  "Add {highlight}Bash(npm install:*){/highlight} to allow npm install globally",
  "Project settings are in {highlight}.codetyper/settings.json{/highlight}",
  "Global settings are in {highlight}~/.codetyper/settings.json{/highlight}",
  "Use {highlight}/context{/highlight} to check conversation size",
  "Use {highlight}/compact{/highlight} to reduce context size",
  "Commands like {highlight}ls{/highlight} and {highlight}cat{/highlight} are auto-approved",
  "Use {highlight}/exit{/highlight} or {highlight}/quit{/highlight} to end the session",
  "The agent can create folders with {highlight}mkdir{/highlight}",
  "The agent can install packages with {highlight}npm install{/highlight}",
  'Use {highlight}@"file with spaces"{/highlight} for files with spaces',
  "The read tool shows file content with line numbers",
  "The edit tool replaces exact text matches",
  "The write tool creates files and directories",
  "Use {highlight}/history{/highlight} to see past messages",
  "Session rules persist until you exit",
  "Project rules persist across sessions in this directory",
  "Global rules apply everywhere",
] as const;

// Keyboard shortcuts
export const SHORTCUTS = [
  { key: "Ctrl+C", description: "Cancel current operation / Exit" },
  { key: "/help", description: "Show help" },
  { key: "/clear", description: "Clear conversation" },
  { key: "/exit", description: "Exit chat" },
  { key: "@file", description: "Add file to context" },
] as const;

// Highlight regex pattern
export const TIP_HIGHLIGHT_REGEX = /\{highlight\}(.*?)\{\/highlight\}/g;
