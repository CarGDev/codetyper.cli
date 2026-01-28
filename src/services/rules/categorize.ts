/**
 * Rule categorization utilities
 */

import { MCP_CATEGORIES, TOOL_CATEGORIES } from "@constants/rules";
import type { RuleFile, RuleType, ProjectRules } from "@/types/rules";

const isMCPCategory = (category: string): boolean =>
  (MCP_CATEGORIES as readonly string[]).includes(category);

const isToolCategory = (category: string): boolean =>
  (TOOL_CATEGORIES as readonly string[]).includes(category);

export const categorizeRule = (rule: RuleFile): RuleType => {
  if (isMCPCategory(rule.category)) {
    return "mcp";
  }
  if (isToolCategory(rule.category)) {
    return "tool";
  }
  return "custom";
};

export const RULE_TYPE_HANDLERS: Record<
  RuleType,
  (rules: ProjectRules, rule: RuleFile) => void
> = {
  mcp: (rules, rule) => rules.mcp.push(rule),
  tool: (rules, rule) => rules.tools.push(rule),
  custom: (rules, rule) => rules.custom.push(rule),
};

export const addRuleToProject = (rules: ProjectRules, rule: RuleFile): void => {
  const type = categorizeRule(rule);
  const handler = RULE_TYPE_HANDLERS[type];
  handler(rules, rule);
  rules.allPaths.push(rule.path);
};
