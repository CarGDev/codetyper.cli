/**
 * Security Reviewer
 *
 * Analyzes code for security vulnerabilities.
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
 * Security patterns to check
 */
const SECURITY_PATTERNS = {
  SQL_INJECTION: {
    patterns: [
      /`SELECT .* FROM .* WHERE .*\$\{/i,
      /`INSERT INTO .* VALUES.*\$\{/i,
      /`UPDATE .* SET .*\$\{/i,
      /`DELETE FROM .* WHERE .*\$\{/i,
      /query\s*\(\s*['"`].*\$\{/i,
      /execute\s*\(\s*['"`].*\$\{/i,
    ],
    message: "Potential SQL injection vulnerability",
    suggestion: "Use parameterized queries or prepared statements",
    confidence: 90,
  },

  XSS: {
    patterns: [
      /innerHTML\s*=\s*[^"'].*\+/,
      /dangerouslySetInnerHTML/,
      /document\.write\s*\(/,
      /\.html\s*\([^)]*\+/,
      /v-html\s*=/,
    ],
    message: "Potential XSS vulnerability",
    suggestion: "Sanitize user input before rendering or use text content",
    confidence: 85,
  },

  COMMAND_INJECTION: {
    patterns: [
      /exec\s*\(\s*['"`].*\$\{/,
      /spawn\s*\(\s*['"`].*\$\{/,
      /execSync\s*\(\s*['"`].*\$\{/,
      /child_process.*\$\{/,
      /\$\(.* \+ /,
    ],
    message: "Potential command injection vulnerability",
    suggestion:
      "Avoid string concatenation in shell commands, use argument arrays",
    confidence: 90,
  },

  PATH_TRAVERSAL: {
    patterns: [
      /readFile\s*\([^)]*\+/,
      /readFileSync\s*\([^)]*\+/,
      /fs\..*\([^)]*\+.*req\./,
      /path\.join\s*\([^)]*req\./,
    ],
    message: "Potential path traversal vulnerability",
    suggestion: "Validate and sanitize file paths, use path.normalize",
    confidence: 85,
  },

  SECRETS_EXPOSURE: {
    patterns: [
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i,
      /private[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /Bearer\s+[A-Za-z0-9_-]+/,
    ],
    message: "Potential hardcoded secret",
    suggestion: "Use environment variables or a secrets manager",
    confidence: 80,
  },

  INSECURE_RANDOM: {
    patterns: [/Math\.random\s*\(\)/],
    message: "Insecure random number generation",
    suggestion:
      "Use crypto.randomBytes or crypto.getRandomValues for security-sensitive operations",
    confidence: 70,
  },

  EVAL_USAGE: {
    patterns: [
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /setTimeout\s*\(\s*['"`]/,
      /setInterval\s*\(\s*['"`]/,
    ],
    message: "Dangerous use of eval or dynamic code execution",
    suggestion: "Avoid eval and dynamic code execution, use safer alternatives",
    confidence: 85,
  },
} as const;

/**
 * Run security review on a file
 */
export const reviewFile = (
  fileContext: ReviewFileContext,
): PRReviewFinding[] => {
  const findings: PRReviewFinding[] = [];
  const { diff, path } = fileContext;

  // Get all added lines
  const addedLines = getAllAddedLines(diff);

  // Check each pattern
  for (const [patternName, config] of Object.entries(SECURITY_PATTERNS)) {
    for (const { content, lineNumber } of addedLines) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          // Only report if confidence meets threshold
          if (config.confidence >= MIN_CONFIDENCE_THRESHOLD) {
            findings.push({
              id: generateFindingId(),
              type: "security",
              severity: config.confidence >= 90 ? "critical" : "warning",
              file: path,
              line: lineNumber,
              message: config.message,
              details: `Found pattern: ${patternName}`,
              suggestion: config.suggestion,
              confidence: config.confidence,
              reviewer: "security",
            });
          }
          break; // One finding per line per pattern type
        }
      }
    }
  }

  return findings;
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
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get reviewer prompt
 */
export const getPrompt = (): string => {
  return REVIEWER_PROMPTS.security;
};
