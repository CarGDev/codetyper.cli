/**
 * Edit tool validation utilities
 */

import { EDIT_MESSAGES, EDIT_TITLES } from "@constants/edit";
import type { ToolResult } from "@/types/tools";

export const validateTextExists = (
  content: string,
  oldString: string,
  relativePath: string,
): ToolResult | null => {
  if (!content.includes(oldString)) {
    return {
      success: false,
      title: EDIT_TITLES.FAILED(relativePath),
      output: "",
      error: EDIT_MESSAGES.NOT_FOUND,
    };
  }
  return null;
};

export const validateUniqueness = (
  content: string,
  oldString: string,
  replaceAll: boolean,
  relativePath: string,
): ToolResult | null => {
  if (replaceAll) {
    return null;
  }

  const occurrences = content.split(oldString).length - 1;
  if (occurrences > 1) {
    return {
      success: false,
      title: EDIT_TITLES.FAILED(relativePath),
      output: "",
      error: EDIT_MESSAGES.MULTIPLE_OCCURRENCES(occurrences),
    };
  }
  return null;
};

export const countOccurrences = (content: string, search: string): number =>
  content.split(search).length - 1;
