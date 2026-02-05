/**
 * Logic Reviewer
 *
 * Analyzes code for logical errors and edge cases.
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
 * Logic patterns to check
 */
const LOGIC_PATTERNS = {
  MISSING_NULL_CHECK: {
    patterns: [
      /\w+\.\w+\.\w+/, // Deep property access without optional chaining
      /(\w+)\[['"][^'"]+['"]\]\.\w+/, // Object property followed by method
    ],
    message: "Potential null/undefined reference",
    suggestion: "Use optional chaining (?.) or add null checks",
    confidence: 70,
  },

  OPTIONAL_CHAIN_MISSING: {
    patterns: [
      /if\s*\([^)]*\)\s*\{[^}]*\w+\./, // Variable used after if check without ?.
    ],
    message: "Consider using optional chaining",
    suggestion: "Replace conditional access with ?. operator",
    confidence: 65,
  },

  EMPTY_CATCH: {
    patterns: [/catch\s*\([^)]*\)\s*\{\s*\}/, /catch\s*\{\s*\}/],
    message: "Empty catch block - errors silently ignored",
    suggestion: "Log the error or handle it appropriately",
    confidence: 90,
  },

  UNHANDLED_PROMISE: {
    patterns: [
      /\basync\s+\w+\s*\([^)]*\)\s*\{[^}]*(?!try)[^}]*await\s+[^}]*\}/,
    ],
    message: "Async function without try-catch",
    suggestion: "Wrap await calls in try-catch or use .catch()",
    confidence: 70,
  },

  FLOATING_PROMISE: {
    patterns: [/^\s*\w+\s*\.\s*then\s*\(/m, /^\s*\w+\([^)]*\)\.then\s*\(/m],
    message: "Floating promise - missing await or error handling",
    suggestion: "Use await or add .catch() for error handling",
    confidence: 80,
  },

  ARRAY_INDEX_ACCESS: {
    patterns: [/\[\d+\]/, /\[0\]/, /\[-1\]/],
    message: "Direct array index access without bounds check",
    suggestion: "Consider using .at() or add bounds checking",
    confidence: 60,
  },

  EQUALITY_TYPE_COERCION: {
    patterns: [/[^=!]==[^=]/, /[^!]!=[^=]/],
    message: "Using == instead of === (type coercion)",
    suggestion: "Use strict equality (===) to avoid type coercion bugs",
    confidence: 85,
  },

  ASYNC_IN_FOREACH: {
    patterns: [/\.forEach\s*\(\s*async/],
    message: "Async callback in forEach - won't await properly",
    suggestion: "Use for...of loop or Promise.all with .map()",
    confidence: 90,
  },

  MUTATING_PARAMETER: {
    patterns: [
      /function\s+\w+\s*\(\w+\)\s*\{[^}]*\w+\s*\.\s*\w+\s*=/,
      /\(\w+\)\s*=>\s*\{[^}]*\w+\s*\.\s*push/,
    ],
    message: "Mutating function parameter",
    suggestion: "Create a copy before mutating or use immutable patterns",
    confidence: 75,
  },

  RACE_CONDITION: {
    patterns: [/let\s+\w+\s*=[^;]+;\s*await\s+[^;]+;\s*\w+\s*=/],
    message: "Potential race condition with shared state",
    suggestion: "Use atomic operations or proper synchronization",
    confidence: 70,
  },

  INFINITE_LOOP_RISK: {
    patterns: [/while\s*\(\s*true\s*\)/, /for\s*\(\s*;\s*;\s*\)/],
    message: "Infinite loop without clear exit condition",
    suggestion: "Ensure there's a clear break condition",
    confidence: 75,
  },
} as const;

/**
 * Run logic review on a file
 */
export const reviewFile = (
  fileContext: ReviewFileContext,
): PRReviewFinding[] => {
  const findings: PRReviewFinding[] = [];
  const { diff, path } = fileContext;

  // Get all added lines
  const addedLines = getAllAddedLines(diff);

  // Check each pattern
  for (const [patternName, config] of Object.entries(LOGIC_PATTERNS)) {
    // Skip patterns below threshold
    if (config.confidence < MIN_CONFIDENCE_THRESHOLD) {
      continue;
    }

    for (const { content, lineNumber } of addedLines) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          findings.push({
            id: generateFindingId(),
            type: "logic",
            severity: determineSeverity(config.confidence),
            file: path,
            line: lineNumber,
            message: config.message,
            details: `Pattern: ${patternName}`,
            suggestion: config.suggestion,
            confidence: config.confidence,
            reviewer: "logic",
          });
          break;
        }
      }
    }
  }

  // Deduplicate similar findings
  return deduplicateFindings(findings);
};

/**
 * Determine severity based on confidence
 */
const determineSeverity = (
  confidence: number,
): "critical" | "warning" | "suggestion" => {
  if (confidence >= 90) return "critical";
  if (confidence >= 80) return "warning";
  return "suggestion";
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
 * Deduplicate findings with same message on adjacent lines
 */
const deduplicateFindings = (
  findings: PRReviewFinding[],
): PRReviewFinding[] => {
  const seen = new Map<string, PRReviewFinding>();

  for (const finding of findings) {
    const key = `${finding.file}:${finding.message}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, finding);
    } else if (finding.line && existing.line) {
      // Keep finding with more specific line number
      if (Math.abs(finding.line - existing.line) > 5) {
        // Different location, keep both
        seen.set(`${key}:${finding.line}`, finding);
      }
    }
  }

  return Array.from(seen.values());
};

/**
 * Generate unique finding ID
 */
const generateFindingId = (): string => {
  return `logic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get reviewer prompt
 */
export const getPrompt = (): string => {
  return REVIEWER_PROMPTS.logic;
};
