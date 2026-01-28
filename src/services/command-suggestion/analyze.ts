/**
 * File change analysis for command suggestions
 */

import { basename } from "path";

import { detectProjectContext } from "@services/command-suggestion/context";
import { SUGGESTION_PATTERNS } from "@services/command-suggestion/patterns";
import {
  getProjectContext,
  setProjectContext,
  addSuggestion,
} from "@services/command-suggestion/state";
import type {
  CommandSuggestion,
  SuggestionPattern,
} from "@/types/command-suggestion";

const matchesFilePattern = (
  pattern: SuggestionPattern,
  filePath: string,
  fileName: string,
): boolean =>
  pattern.filePatterns.some((p) => p.test(filePath) || p.test(fileName));

const matchesContentPattern = (
  pattern: SuggestionPattern,
  content?: string,
): boolean => {
  if (!pattern.contentPatterns || !content) {
    return true;
  }
  return pattern.contentPatterns.some((p) => p.test(content));
};

export const analyzeFileChange = (
  filePath: string,
  content?: string,
): CommandSuggestion[] => {
  let ctx = getProjectContext();
  if (!ctx) {
    ctx = detectProjectContext(process.cwd());
    setProjectContext(ctx);
  }

  const newSuggestions: CommandSuggestion[] = [];
  const fileName = basename(filePath);

  for (const pattern of SUGGESTION_PATTERNS) {
    if (!matchesFilePattern(pattern, filePath, fileName)) {
      continue;
    }

    if (!matchesContentPattern(pattern, content)) {
      continue;
    }

    const suggestions = pattern.suggestions(ctx, filePath);

    for (const suggestion of suggestions) {
      if (addSuggestion(suggestion)) {
        newSuggestions.push(suggestion);
      }
    }
  }

  return newSuggestions;
};
