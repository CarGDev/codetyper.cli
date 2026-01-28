/**
 * Rule formatting utilities
 */

import { RULES_SECTION_TITLES } from "@constants/rules";
import type { RuleFile, RuleType } from "@/types/rules";

const capitalizeWord = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

const formatCategoryTitle = (category: string): string =>
  category.split("-").map(capitalizeWord).join(" ");

const formatSingleRule = (rule: RuleFile): string => {
  const categoryTitle = formatCategoryTitle(rule.category);
  return `### ${categoryTitle}\n\n${rule.content}`;
};

export const formatRulesSection = (
  title: string,
  rules: RuleFile[],
): string => {
  if (rules.length === 0) return "";

  const sections = rules.map(formatSingleRule);
  return `## ${title}\n\n${sections.join("\n\n")}`;
};

export const formatRulesByType = (
  type: RuleType,
  rules: RuleFile[],
): string => {
  const title = RULES_SECTION_TITLES[type];
  return formatRulesSection(title, rules);
};
