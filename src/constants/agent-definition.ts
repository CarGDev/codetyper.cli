/**
 * Agent definition constants
 */

export const AGENT_DEFINITION = {
  FILE_EXTENSION: ".md",
  DIRECTORY_NAME: "agents",
  FRONTMATTER_DELIMITER: "---",
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TOOLS: 20,
  MAX_TRIGGER_PHRASES: 10,
} as const;

export const AGENT_DEFINITION_PATHS = {
  PROJECT: ".codetyper/agents",
  GLOBAL: "~/.config/codetyper/agents",
  BUILTIN: "src/agents",
} as const;

export const AGENT_DEFAULT_TOOLS = {
  EXPLORE: ["read", "glob", "grep"],
  PLAN: ["read", "glob", "grep", "web_search"],
  CODE: ["read", "write", "edit", "glob", "grep", "bash"],
  REVIEW: ["read", "glob", "grep", "lsp"],
  BASH: ["bash", "read"],
} as const;

export const AGENT_COLORS = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  BLUE: "\x1b[34m",
  YELLOW: "\x1b[33m",
  CYAN: "\x1b[36m",
  MAGENTA: "\x1b[35m",
  WHITE: "\x1b[37m",
  GRAY: "\x1b[90m",
  RESET: "\x1b[0m",
} as const;

export const AGENT_TIER_CONFIG = {
  fast: {
    model: "gpt-4o-mini",
    maxTurns: 5,
    timeout: 30000,
  },
  balanced: {
    model: "gpt-4o",
    maxTurns: 10,
    timeout: 60000,
  },
  thorough: {
    model: "o1",
    maxTurns: 20,
    timeout: 120000,
  },
} as const;

export const AGENT_MESSAGES = {
  LOADING: "Loading agent definitions...",
  LOADED: "Agent definitions loaded",
  NOT_FOUND: "Agent definition not found",
  INVALID_FRONTMATTER: "Invalid YAML frontmatter",
  MISSING_REQUIRED: "Missing required field",
  INVALID_TOOL: "Invalid tool specified",
} as const;
