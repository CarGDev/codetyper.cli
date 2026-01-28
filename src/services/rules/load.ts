/**
 * Rule file loading utilities
 */

import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, basename, extname } from "path";

import type { RuleFile, RuleCategory } from "@/types/rules";

export const loadRuleFile = async (
  filePath: string,
  category: RuleCategory,
): Promise<RuleFile | null> => {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readFile(filePath, "utf-8");
    const trimmedContent = content.trim();

    if (trimmedContent) {
      return {
        category,
        content: trimmedContent,
        path: filePath,
      };
    }
  } catch {
    // Ignore read errors
  }

  return null;
};

const isMarkdownFile = (filename: string): boolean => filename.endsWith(".md");

const getCategoryFromFilename = (filename: string): string =>
  basename(filename, extname(filename)).toLowerCase();

export const loadRulesDirectory = async (
  dirPath: string,
): Promise<RuleFile[]> => {
  if (!existsSync(dirPath)) {
    return [];
  }

  const rules: RuleFile[] = [];

  try {
    const files = await readdir(dirPath);

    for (const file of files) {
      if (!isMarkdownFile(file)) continue;

      const category = getCategoryFromFilename(file);
      const filePath = join(dirPath, file);
      const rule = await loadRuleFile(filePath, category);

      if (rule) {
        rules.push(rule);
      }
    }
  } catch {
    // Ignore directory read errors
  }

  return rules;
};
