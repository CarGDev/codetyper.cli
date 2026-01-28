/**
 * Types for project rules loading
 */

import type {
  MCP_CATEGORIES,
  TOOL_CATEGORIES,
  RULE_TYPES,
} from "@constants/rules";

export type MCPCategory = (typeof MCP_CATEGORIES)[number];
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];
export type RuleCategory = "general" | MCPCategory | ToolCategory | string;
export type RuleType = (typeof RULE_TYPES)[number];

export interface RuleFile {
  category: RuleCategory;
  content: string;
  path: string;
}

export interface ProjectRules {
  general: RuleFile | null;
  mcp: RuleFile[];
  tools: RuleFile[];
  custom: RuleFile[];
  allPaths: string[];
}

export interface RulesResult {
  prompt: string;
  rulesPath: string | null;
  rulesPaths: string[];
}
