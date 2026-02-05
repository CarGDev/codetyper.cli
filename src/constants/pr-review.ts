/**
 * PR Review Toolkit Constants
 *
 * Configuration for multi-agent code review.
 */

import type {
  PRReviewConfig,
  ReviewSeverity,
  ReviewFindingType,
} from "@/types/pr-review";

/**
 * Minimum confidence threshold for reporting findings
 * Only report findings with confidence >= 80%
 */
export const MIN_CONFIDENCE_THRESHOLD = 80;

/**
 * Default review configuration
 */
export const DEFAULT_REVIEW_CONFIG: PRReviewConfig = {
  minConfidence: MIN_CONFIDENCE_THRESHOLD,
  reviewers: [
    { name: "security", type: "security", enabled: true, minConfidence: 80 },
    {
      name: "performance",
      type: "performance",
      enabled: true,
      minConfidence: 80,
    },
    { name: "style", type: "style", enabled: true, minConfidence: 85 },
    { name: "logic", type: "logic", enabled: true, minConfidence: 80 },
  ],
  security: {
    checkInjection: true,
    checkXSS: true,
    checkAuth: true,
    checkSecrets: true,
    checkDependencies: true,
  },
  performance: {
    checkComplexity: true,
    checkMemory: true,
    checkQueries: true,
    checkCaching: true,
    checkRenders: true,
  },
  style: {
    checkNaming: true,
    checkFormatting: true,
    checkConsistency: true,
    checkComments: true,
  },
  logic: {
    checkEdgeCases: true,
    checkNullHandling: true,
    checkErrorHandling: true,
    checkConcurrency: true,
    checkTypes: true,
  },
  excludePatterns: [
    "**/node_modules/**",
    "**/*.min.js",
    "**/*.bundle.js",
    "**/dist/**",
    "**/build/**",
    "**/*.lock",
    "**/package-lock.json",
    "**/yarn.lock",
    "**/pnpm-lock.yaml",
  ],
  maxFindings: 50,
} as const;

/**
 * Severity emoji indicators
 */
export const SEVERITY_ICONS: Record<ReviewSeverity, string> = {
  critical: "🔴",
  warning: "🟠",
  suggestion: "🟡",
  nitpick: "🟢",
} as const;

/**
 * Severity labels
 */
export const SEVERITY_LABELS: Record<ReviewSeverity, string> = {
  critical: "CRITICAL",
  warning: "WARNING",
  suggestion: "SUGGESTION",
  nitpick: "NITPICK",
} as const;

/**
 * Finding type labels
 */
export const FINDING_TYPE_LABELS: Record<ReviewFindingType, string> = {
  security: "Security",
  performance: "Performance",
  style: "Style",
  logic: "Logic",
  documentation: "Documentation",
  testing: "Testing",
} as const;

/**
 * Reviewer prompts
 */
export const REVIEWER_PROMPTS: Record<string, string> = {
  security: `You are a security reviewer. Analyze the code changes for:
- SQL injection, XSS, command injection vulnerabilities
- Authentication and authorization issues
- Sensitive data exposure (API keys, passwords, tokens)
- Input validation and sanitization problems
- Insecure dependencies

Only report findings with high confidence (≥80%). For each issue:
- Describe the vulnerability
- Explain the potential impact
- Suggest a specific fix`,

  performance: `You are a performance reviewer. Analyze the code changes for:
- Algorithmic complexity issues (O(n²) or worse operations)
- Memory usage problems (leaks, excessive allocations)
- Database query efficiency (N+1 queries, missing indexes)
- Unnecessary re-renders (React) or DOM manipulations
- Missing caching opportunities

Only report findings with high confidence (≥80%). For each issue:
- Describe the performance impact
- Provide complexity analysis if applicable
- Suggest optimization`,

  style: `You are a code style reviewer. Analyze the code changes for:
- Naming convention violations
- Inconsistent formatting
- Code organization issues
- Missing or unclear documentation
- Deviations from project patterns

Only report significant style issues that affect readability or maintainability.
Skip minor formatting issues that could be auto-fixed.`,

  logic: `You are a logic reviewer. Analyze the code changes for:
- Edge cases not handled
- Null/undefined reference risks
- Error handling gaps
- Race conditions or concurrency issues
- Type safety violations

Only report findings with high confidence (≥80%). For each issue:
- Describe the bug or potential bug
- Explain how it could manifest
- Suggest a fix with example code`,
} as const;

/**
 * Rating thresholds
 */
export const RATING_THRESHOLDS = {
  5: { maxCritical: 0, maxWarning: 0 },
  4: { maxCritical: 0, maxWarning: 3 },
  3: { maxCritical: 0, maxWarning: 10 },
  2: { maxCritical: 1, maxWarning: 20 },
  1: { maxCritical: Infinity, maxWarning: Infinity },
} as const;

/**
 * Recommendation thresholds
 */
export const RECOMMENDATION_THRESHOLDS = {
  approve: { maxCritical: 0, maxWarning: 0, maxSuggestion: 5 },
  approve_with_suggestions: {
    maxCritical: 0,
    maxWarning: 3,
    maxSuggestion: Infinity,
  },
  request_changes: {
    maxCritical: 1,
    maxWarning: Infinity,
    maxSuggestion: Infinity,
  },
  needs_discussion: {
    maxCritical: Infinity,
    maxWarning: Infinity,
    maxSuggestion: Infinity,
  },
} as const;

/**
 * Error messages
 */
export const PR_REVIEW_ERRORS = {
  NO_DIFF: "No diff content to review",
  PARSE_FAILED: (error: string) => `Failed to parse diff: ${error}`,
  REVIEWER_FAILED: (reviewer: string, error: string) =>
    `Reviewer ${reviewer} failed: ${error}`,
  NO_FILES: "No files in diff to review",
  EXCLUDED_ALL: "All files excluded by pattern",
} as const;

/**
 * Status messages
 */
export const PR_REVIEW_MESSAGES = {
  STARTING: "Starting PR review...",
  PARSING_DIFF: "Parsing diff...",
  REVIEWING: (reviewer: string) => `Running ${reviewer} review...`,
  AGGREGATING: "Aggregating results...",
  COMPLETED: (findings: number) => `Review complete: ${findings} finding(s)`,
  NO_FINDINGS: "No issues found",
} as const;

/**
 * Report titles
 */
export const PR_REVIEW_TITLES = {
  REPORT: "Pull Request Review",
  FINDINGS: "Findings",
  SUMMARY: "Summary",
  RECOMMENDATION: "Recommendation",
} as const;
