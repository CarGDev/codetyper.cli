/**
 * Rules loader service for project-specific agent behavior
 *
 * Loads rules from the project directory to customize how the agent
 * should behave. Supports:
 * - General rules (rules.md)
 * - MCP-specific rules (rules/figma.md, rules/browser.md, etc.)
 * - Tool-specific rules (rules/bash.md, rules/edit.md, etc.)
 * - GitHub files (.github/copilot-instructions.md, .github/*.md)
 */

export { loadRuleFile, loadRulesDirectory } from "@services/rules/load";
export {
  categorizeRule,
  addRuleToProject,
  RULE_TYPE_HANDLERS,
} from "@services/rules/categorize";
export { formatRulesSection, formatRulesByType } from "@services/rules/format";
export {
  loadProjectRules,
  buildSystemPromptWithRules,
  getRulesForCategory,
} from "@services/rules/prompt";
export type {
  RuleFile,
  RuleCategory,
  RuleType,
  ProjectRules,
  RulesResult,
  MCPCategory,
  ToolCategory,
} from "@/types/rules";
