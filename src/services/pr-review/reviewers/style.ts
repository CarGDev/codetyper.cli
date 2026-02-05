/**
 * Style Reviewer
 *
 * Analyzes code for style and consistency issues.
 */

import {
  MIN_CONFIDENCE_THRESHOLD,
  REVIEWER_PROMPTS,
} from "@constants/pr-review";
import type {
  PRReviewFinding,
  ParsedFileDiff,
  ReviewFileContext,
} from "@/types/pr-review";

/**
 * Style patterns to check
 */
const STYLE_PATTERNS = {
  CONSOLE_LOG: {
    patterns: [/console\.(log|debug|info)\s*\(/],
    message: "Console statement left in code",
    suggestion: "Remove console statements before committing or use a logger",
    confidence: 85,
  },

  TODO_COMMENT: {
    patterns: [
      /\/\/\s*TODO[:\s]/i,
      /\/\/\s*FIXME[:\s]/i,
      /\/\/\s*HACK[:\s]/i,
      /\/\*\s*TODO[:\s]/i,
    ],
    message: "TODO/FIXME comment found",
    suggestion: "Address the TODO or create a tracking issue",
    confidence: 70,
  },

  MAGIC_NUMBER: {
    patterns: [
      /(?<![a-zA-Z_])(?:86400|3600|60000|1000|24|60|365|1024|2048|4096)(?![a-zA-Z_\d])/,
    ],
    message: "Magic number - consider using a named constant",
    suggestion: "Extract to a named constant for better readability",
    confidence: 70,
  },

  LONG_LINE: {
    patterns: [/.{121,}/],
    message: "Line exceeds 120 characters",
    suggestion: "Break long lines for better readability",
    confidence: 75,
  },

  INCONSISTENT_QUOTES: {
    patterns: [/["'][^"']*["']/],
    message: "Inconsistent quote style",
    suggestion: "Use consistent quotes (single or double) throughout the file",
    confidence: 60,
  },

  VAR_DECLARATION: {
    patterns: [/\bvar\s+\w+/],
    message: "Using 'var' instead of 'let' or 'const'",
    suggestion: "Prefer 'const' for immutable values, 'let' for mutable",
    confidence: 85,
  },

  NESTED_TERNARY: {
    patterns: [/\?[^:]+\?[^:]+:/],
    message: "Nested ternary operator - hard to read",
    suggestion: "Use if-else statements or extract to a function",
    confidence: 80,
  },

  CALLBACK_HELL: {
    patterns: [
      /\)\s*=>\s*\{[^}]*\)\s*=>\s*\{[^}]*\)\s*=>\s*\{/,
      /\.then\([^)]+\.then\([^)]+\.then\(/,
    ],
    message: "Deeply nested callbacks - callback hell",
    suggestion: "Refactor using async/await or extract functions",
    confidence: 80,
  },

  ANY_TYPE: {
    patterns: [/:\s*any\b/, /<any>/, /as\s+any\b/],
    message: "Using 'any' type reduces type safety",
    suggestion: "Use specific types or 'unknown' with type guards",
    confidence: 75,
  },

  SINGLE_LETTER_VAR: {
    patterns: [/\b(?:const|let|var)\s+[a-z]\s*=/],
    message: "Single-letter variable name",
    suggestion: "Use descriptive variable names for clarity",
    confidence: 65,
  },

  COMMENTED_CODE: {
    patterns: [
      /\/\/\s*(?:const|let|var|function|if|for|while|return)\s+\w+/,
      /\/\*\s*(?:const|let|var|function|if|for|while|return)\s+\w+/,
    ],
    message: "Commented out code detected",
    suggestion: "Remove commented code - use version control for history",
    confidence: 80,
  },

  DUPLICATE_IMPORT: {
    patterns: [/import\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/],
    message: "Check for duplicate or unused imports",
    suggestion: "Consolidate imports from the same module",
    confidence: 60,
  },
} as const;

/**
 * Run style review on a file
 */
export const reviewFile = (
  fileContext: ReviewFileContext,
): PRReviewFinding[] => {
  const findings: PRReviewFinding[] = [];
  const { diff, path } = fileContext;

  // Get all added lines
  const addedLines = getAllAddedLines(diff);

  // Check each pattern
  for (const [patternName, config] of Object.entries(STYLE_PATTERNS)) {
    // Skip patterns below threshold
    if (config.confidence < MIN_CONFIDENCE_THRESHOLD) {
      continue;
    }

    let foundInFile = false;

    for (const { content, lineNumber } of addedLines) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          // For some patterns, only report once per file
          if (shouldReportOncePerFile(patternName)) {
            if (!foundInFile) {
              findings.push(
                createFinding(path, lineNumber, config, patternName),
              );
              foundInFile = true;
            }
          } else {
            findings.push(createFinding(path, lineNumber, config, patternName));
          }
          break;
        }
      }
    }
  }

  // Limit findings per pattern type
  return limitFindings(findings, 3);
};

/**
 * Check if pattern should only be reported once per file
 */
const shouldReportOncePerFile = (patternName: string): boolean => {
  const oncePerFile = new Set([
    "INCONSISTENT_QUOTES",
    "VAR_DECLARATION",
    "ANY_TYPE",
    "DUPLICATE_IMPORT",
  ]);
  return oncePerFile.has(patternName);
};

/**
 * Create a finding from config
 */
const createFinding = (
  path: string,
  lineNumber: number,
  config: { message: string; suggestion: string; confidence: number },
  patternName: string,
): PRReviewFinding => ({
  id: generateFindingId(),
  type: "style",
  severity: config.confidence >= 85 ? "warning" : "nitpick",
  file: path,
  line: lineNumber,
  message: config.message,
  details: `Pattern: ${patternName}`,
  suggestion: config.suggestion,
  confidence: config.confidence,
  reviewer: "style",
});

/**
 * Limit findings per pattern to avoid noise
 */
const limitFindings = (
  findings: PRReviewFinding[],
  maxPerPattern: number,
): PRReviewFinding[] => {
  const countByMessage = new Map<string, number>();
  const result: PRReviewFinding[] = [];

  for (const finding of findings) {
    const count = countByMessage.get(finding.message) ?? 0;
    if (count < maxPerPattern) {
      result.push(finding);
      countByMessage.set(finding.message, count + 1);
    }
  }

  return result;
};

/**
 * Get all added lines with line numbers
 */
const getAllAddedLines = (
  diff: ParsedFileDiff,
): Array<{ content: string; lineNumber: number }> => {
  const lines: Array<{ content: string; lineNumber: number }> = [];

  for (const hunk of diff.hunks) {
    let lineNumber = hunk.newStart;

    for (const addition of hunk.additions) {
      lines.push({
        content: addition,
        lineNumber,
      });
      lineNumber++;
    }
  }

  return lines;
};

/**
 * Generate unique finding ID
 */
const generateFindingId = (): string => {
  return `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get reviewer prompt
 */
export const getPrompt = (): string => {
  return REVIEWER_PROMPTS.style;
};
