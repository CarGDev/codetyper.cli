/**
 * Learning pattern categorization
 */

import { CATEGORY_PATTERNS } from "@constants/learning";
import type { LearningCategory } from "@/types/learning";

const findMatchingCategory = (patternStr: string): LearningCategory | null => {
  for (const [keyword, category] of Object.entries(CATEGORY_PATTERNS)) {
    if (patternStr.includes(keyword)) {
      return category;
    }
  }
  return null;
};

export const categorizePattern = (pattern: RegExp): LearningCategory => {
  const patternStr = pattern.toString().toLowerCase();
  return findMatchingCategory(patternStr) ?? "general";
};
