/**
 * Constants for project rules loading
 */

/** Locations to search for general rules file */
export const GENERAL_RULES_PATHS = [
  "rules.md",
  "RULES.md",
  ".rules.md",
  "codetyper.rules.md",
  ".codetyper/rules.md",
  ".github/copilot-instructions.md",
  ".github/INSTRUCTIONS.md",
  ".github/instructions.md",
] as const;

/** Directories to search for categorized rules */
export const RULES_DIRECTORIES = [
  "rules",
  ".rules",
  ".codetyper/rules",
  ".github",
] as const;

/** Well-known MCP categories */
export const MCP_CATEGORIES = [
  "figma",
  "browser",
  "github",
  "gitlab",
  "slack",
  "notion",
  "linear",
  "jira",
  "confluence",
  "google-docs",
  "google-sheets",
  "airtable",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "vercel",
  "netlify",
  "supabase",
  "firebase",
] as const;

/** Well-known tool categories */
export const TOOL_CATEGORIES = [
  "bash",
  "read",
  "write",
  "edit",
  "search",
  "git",
] as const;

/** Rule types for categorization */
export const RULE_TYPES = ["mcp", "tool", "custom"] as const;

/** Section titles for formatted rules */
export const RULES_SECTION_TITLES = {
  mcp: "MCP Integration Rules",
  tool: "Tool Usage Rules",
  custom: "Additional Rules",
} as const;

/** Prompt templates for rules */
export const RULES_PROMPT_TEMPLATES = {
  PROJECT_RULES_HEADER:
    "## Project Rules\n\nThe following rules are specific to this project and must be followed:\n\n",
} as const;
