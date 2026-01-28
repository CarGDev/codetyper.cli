/**
 * Issue number extraction from text
 */

import { ISSUE_PATTERNS, GITHUB_ISSUE_DEFAULTS } from "@constants/github-issue";

const isValidIssueNumber = (num: number): boolean =>
  num >= GITHUB_ISSUE_DEFAULTS.MIN_ISSUE_NUMBER &&
  num < GITHUB_ISSUE_DEFAULTS.MAX_ISSUE_NUMBER;

const extractFromPattern = (pattern: RegExp, message: string): number[] => {
  const numbers: number[] = [];
  pattern.lastIndex = 0;

  let match;
  while ((match = pattern.exec(message)) !== null) {
    const num = parseInt(match[1], 10);
    if (isValidIssueNumber(num)) {
      numbers.push(num);
    }
  }

  return numbers;
};

export const extractIssueNumbers = (message: string): number[] => {
  const numbers = new Set<number>();

  for (const pattern of ISSUE_PATTERNS) {
    const extracted = extractFromPattern(pattern, message);
    for (const num of extracted) {
      numbers.add(num);
    }
  }

  return Array.from(numbers).sort((a, b) => a - b);
};
