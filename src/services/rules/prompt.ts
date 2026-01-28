/**
 * Rules prompt building utilities
 */

import { join } from "path";

import {
  GENERAL_RULES_PATHS,
  RULES_DIRECTORIES,
  RULES_PROMPT_TEMPLATES,
} from "@constants/rules";
import { loadRuleFile, loadRulesDirectory } from "@services/rules/load";
import { addRuleToProject } from "@services/rules/categorize";
import { formatRulesByType } from "@services/rules/format";
import type {
  RuleFile,
  RuleCategory,
  ProjectRules,
  RulesResult,
} from "@/types/rules";

const createEmptyProjectRules = (): ProjectRules => ({
  general: null,
  mcp: [],
  tools: [],
  custom: [],
  allPaths: [],
});

const loadGeneralRules = async (
  workingDir: string,
  result: ProjectRules,
): Promise<void> => {
  for (const filename of GENERAL_RULES_PATHS) {
    const rulePath = join(workingDir, filename);
    const rule = await loadRuleFile(rulePath, "general");

    if (rule) {
      result.general = rule;
      result.allPaths.push(rule.path);
      break;
    }
  }
};

const processDirectoryRule = (rule: RuleFile, result: ProjectRules): void => {
  if (rule.category === "general") {
    if (!result.general) {
      result.general = rule;
      result.allPaths.push(rule.path);
    }
    return;
  }

  addRuleToProject(result, rule);
};

const loadCategorizedRules = async (
  workingDir: string,
  result: ProjectRules,
): Promise<void> => {
  for (const dirName of RULES_DIRECTORIES) {
    const dirPath = join(workingDir, dirName);
    const rules = await loadRulesDirectory(dirPath);

    for (const rule of rules) {
      processDirectoryRule(rule, result);
    }
  }
};

export const loadProjectRules = async (
  workingDir: string = process.cwd(),
): Promise<ProjectRules> => {
  const result = createEmptyProjectRules();

  await loadGeneralRules(workingDir, result);
  await loadCategorizedRules(workingDir, result);

  return result;
};

const hasNoRules = (rules: ProjectRules): boolean =>
  !rules.general &&
  rules.mcp.length === 0 &&
  rules.tools.length === 0 &&
  rules.custom.length === 0;

const buildRulesSections = (rules: ProjectRules): string[] => {
  const sections: string[] = [];

  if (rules.general) {
    sections.push(
      `${RULES_PROMPT_TEMPLATES.PROJECT_RULES_HEADER}${rules.general.content}`,
    );
  }

  if (rules.mcp.length > 0) {
    sections.push(formatRulesByType("mcp", rules.mcp));
  }

  if (rules.tools.length > 0) {
    sections.push(formatRulesByType("tool", rules.tools));
  }

  if (rules.custom.length > 0) {
    sections.push(formatRulesByType("custom", rules.custom));
  }

  return sections;
};

export const buildSystemPromptWithRules = async (
  basePrompt: string,
  workingDir: string = process.cwd(),
): Promise<RulesResult> => {
  const rules = await loadProjectRules(workingDir);

  if (hasNoRules(rules)) {
    return { prompt: basePrompt, rulesPath: null, rulesPaths: [] };
  }

  const sections = buildRulesSections(rules);
  const promptWithRules = `${basePrompt}\n\n${sections.join("\n\n")}`;

  return {
    prompt: promptWithRules,
    rulesPath: rules.general?.path ?? rules.allPaths[0] ?? null,
    rulesPaths: rules.allPaths,
  };
};

export const getRulesForCategory = async (
  category: RuleCategory,
  workingDir: string = process.cwd(),
): Promise<RuleFile | null> => {
  const rules = await loadProjectRules(workingDir);

  if (category === "general") {
    return rules.general;
  }

  const allCategorized = [...rules.mcp, ...rules.tools, ...rules.custom];
  return allCategorized.find((r) => r.category === category) ?? null;
};
