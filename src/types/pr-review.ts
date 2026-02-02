/**
 * PR Review Toolkit Types
 *
 * Types for multi-agent code review with specialized reviewers.
 */

/**
 * Review finding types
 */
export type ReviewFindingType =
  | "security"
  | "performance"
  | "style"
  | "logic"
  | "documentation"
  | "testing";

/**
 * Review finding severity
 */
export type ReviewSeverity =
  | "critical"
  | "warning"
  | "suggestion"
  | "nitpick";

/**
 * Confidence level for findings
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Single review finding
 */
export interface PRReviewFinding {
  id: string;
  type: ReviewFindingType;
  severity: ReviewSeverity;
  file: string;
  line?: number;
  endLine?: number;
  message: string;
  details?: string;
  suggestion?: string;
  confidence: number;
  reviewer: string;
}

/**
 * Git diff hunk
 */
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  additions: string[];
  deletions: string[];
  context: string[];
}

/**
 * Parsed diff for a single file
 */
export interface ParsedFileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

/**
 * Complete parsed diff
 */
export interface ParsedDiff {
  files: ParsedFileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

/**
 * Reviewer configuration
 */
export interface ReviewerConfig {
  name: string;
  type: ReviewFindingType;
  enabled: boolean;
  minConfidence: number;
  prompt?: string;
}

/**
 * Security review criteria
 */
export interface SecurityReviewCriteria {
  checkInjection: boolean;
  checkXSS: boolean;
  checkAuth: boolean;
  checkSecrets: boolean;
  checkDependencies: boolean;
}

/**
 * Performance review criteria
 */
export interface PerformanceReviewCriteria {
  checkComplexity: boolean;
  checkMemory: boolean;
  checkQueries: boolean;
  checkCaching: boolean;
  checkRenders: boolean;
}

/**
 * Style review criteria
 */
export interface StyleReviewCriteria {
  checkNaming: boolean;
  checkFormatting: boolean;
  checkConsistency: boolean;
  checkComments: boolean;
}

/**
 * Logic review criteria
 */
export interface LogicReviewCriteria {
  checkEdgeCases: boolean;
  checkNullHandling: boolean;
  checkErrorHandling: boolean;
  checkConcurrency: boolean;
  checkTypes: boolean;
}

/**
 * Review configuration
 */
export interface PRReviewConfig {
  minConfidence: number;
  reviewers: ReviewerConfig[];
  security: SecurityReviewCriteria;
  performance: PerformanceReviewCriteria;
  style: StyleReviewCriteria;
  logic: LogicReviewCriteria;
  excludePatterns: string[];
  maxFindings: number;
}

/**
 * Reviewer result
 */
export interface ReviewerResult {
  reviewer: string;
  findings: PRReviewFinding[];
  duration: number;
  error?: string;
}

/**
 * Overall review rating
 */
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

/**
 * Review recommendation
 */
export type ReviewRecommendation =
  | "approve"
  | "approve_with_suggestions"
  | "request_changes"
  | "needs_discussion";

/**
 * Complete review report
 */
export interface PRReviewReport {
  id: string;
  timestamp: number;
  duration: number;

  // Source information
  baseBranch: string;
  headBranch: string;
  commitRange: string;

  // Diff summary
  filesChanged: number;
  additions: number;
  deletions: number;

  // Findings
  findings: PRReviewFinding[];
  findingsBySeverity: Record<ReviewSeverity, number>;
  findingsByType: Record<ReviewFindingType, number>;

  // Individual reviewer results
  reviewerResults: ReviewerResult[];

  // Overall assessment
  rating: ReviewRating;
  recommendation: ReviewRecommendation;
  summary: string;
}

/**
 * Review request parameters
 */
export interface PRReviewRequest {
  baseBranch?: string;
  headBranch?: string;
  files?: string[];
  config?: Partial<PRReviewConfig>;
}

/**
 * File context for review
 */
export interface ReviewFileContext {
  path: string;
  diff: ParsedFileDiff;
  fullContent?: string;
  language?: string;
}
