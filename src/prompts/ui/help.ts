/**
 * Help Text Prompts
 *
 * User-facing help messages for the CLI interface.
 */

export const HELP_TEXT = `Commands:
  /help      - Show this help
  /clear     - Clear conversation
  /exit      - Exit chat
  /save      - Save session
  /context   - Show context info
  /usage     - Show token usage
  /model     - Select AI model
  /agent     - Select agent
  /remember  - Save a learning about the project
  /learnings - Show saved learnings
  /whoami    - Show logged in account
  /login     - Authenticate with provider
  /logout    - Sign out from provider
  @file      - Add file to context` as const;

export const COMMAND_DESCRIPTIONS: Record<string, string> = {
  help: "Show this help message",
  h: "Show this help message",
  clear: "Clear conversation history",
  c: "Clear conversation history",
  exit: "Exit the chat",
  quit: "Exit the chat",
  q: "Exit the chat",
  save: "Save current session",
  s: "Save current session",
  context: "Show current context size",
  usage: "Show token usage statistics",
  u: "Show token usage statistics",
  model: "Select AI model",
  models: "Show available models",
  m: "Show available models",
  agent: "Select agent",
  a: "Select agent",
  provider: "Switch to a different provider",
  providers: "Show all providers status",
  p: "Show all providers status",
  remember: "Save a learning about the project",
  learnings: "Show saved learnings",
  whoami: "Show logged in account",
  login: "Authenticate with provider",
  logout: "Sign out from provider",
} as const;
