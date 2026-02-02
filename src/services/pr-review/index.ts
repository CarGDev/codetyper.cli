/**
 * PR Review Service
 *
 * Main orchestrator for multi-agent code review.
 */

import {
  DEFAULT_REVIEW_CONFIG,
  PR_REVIEW_ERRORS,
  PR_REVIEW_MESSAGES,
} from "@constants/pr-review";
import { parseDiff, filterFiles, getFilePath } from "@services/pr-review/diff-parser";
import { generateReport, formatReportMarkdown } from "@services/pr-review/report-generator";
import * as securityReviewer from "@services/pr-review/reviewers/security";
import * as performanceReviewer from "@services/pr-review/reviewers/performance";
import * as logicReviewer from "@services/pr-review/reviewers/logic";
import * as styleReviewer from "@services/pr-review/reviewers/style";
import type {
  PRReviewReport,
  PRReviewRequest,
  PRReviewConfig,
  ReviewerResult,
  ParsedDiff,
  ReviewFileContext,
} from "@/types/pr-review";

// Re-export utilities
export * from "@services/pr-review/diff-parser";
export * from "@services/pr-review/report-generator";

// Reviewer map
const reviewers = {
  security: securityReviewer,
  performance: performanceReviewer,
  logic: logicReviewer,
  style: styleReviewer,
} as const;

/**
 * Run a complete PR review
 */
export const reviewPR = async (
  diffContent: string,
  request: PRReviewRequest = {},
  options: {
    onProgress?: (message: string) => void;
    abortSignal?: AbortSignal;
  } = {},
): Promise<PRReviewReport> => {
  const config = { ...DEFAULT_REVIEW_CONFIG, ...request.config };

  options.onProgress?.(PR_REVIEW_MESSAGES.STARTING);

  // Parse diff
  options.onProgress?.(PR_REVIEW_MESSAGES.PARSING_DIFF);
  const diff = parseDiff(diffContent);

  if (diff.files.length === 0) {
    throw new Error(PR_REVIEW_ERRORS.NO_FILES);
  }

  // Filter files
  const filteredFiles = filterFiles(diff.files, config.excludePatterns);

  if (filteredFiles.length === 0) {
    throw new Error(PR_REVIEW_ERRORS.EXCLUDED_ALL);
  }

  // Create filtered diff
  const filteredDiff: ParsedDiff = {
    files: filteredFiles,
    totalAdditions: filteredFiles.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: filteredFiles.reduce((sum, f) => sum + f.deletions, 0),
    totalFiles: filteredFiles.length,
  };

  // Run reviewers in parallel
  const reviewerResults = await runReviewers(
    filteredDiff,
    config,
    options.onProgress,
    options.abortSignal,
  );

  // Generate report
  const report = generateReport(reviewerResults, filteredDiff, {
    baseBranch: request.baseBranch ?? "main",
    headBranch: request.headBranch ?? "HEAD",
    commitRange: `${request.baseBranch ?? "main"}...${request.headBranch ?? "HEAD"}`,
  });

  options.onProgress?.(PR_REVIEW_MESSAGES.COMPLETED(report.findings.length));

  return report;
};

/**
 * Run all enabled reviewers
 */
const runReviewers = async (
  diff: ParsedDiff,
  config: PRReviewConfig,
  onProgress?: (message: string) => void,
  abortSignal?: AbortSignal,
): Promise<ReviewerResult[]> => {
  const results: ReviewerResult[] = [];
  const enabledReviewers = config.reviewers.filter((r) => r.enabled);

  // Run reviewers in parallel
  const promises = enabledReviewers.map(async (reviewerConfig) => {
    if (abortSignal?.aborted) {
      return {
        reviewer: reviewerConfig.name,
        findings: [],
        duration: 0,
        error: "Aborted",
      };
    }

    onProgress?.(PR_REVIEW_MESSAGES.REVIEWING(reviewerConfig.name));

    const startTime = Date.now();
    const reviewerModule = reviewers[reviewerConfig.name as keyof typeof reviewers];

    if (!reviewerModule) {
      return {
        reviewer: reviewerConfig.name,
        findings: [],
        duration: 0,
        error: `Unknown reviewer: ${reviewerConfig.name}`,
      };
    }

    try {
      const findings = [];

      for (const fileDiff of diff.files) {
        const fileContext: ReviewFileContext = {
          path: getFilePath(fileDiff),
          diff: fileDiff,
        };

        const fileFindings = reviewerModule.reviewFile(fileContext);
        findings.push(...fileFindings);
      }

      return {
        reviewer: reviewerConfig.name,
        findings,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        reviewer: reviewerConfig.name,
        findings: [],
        duration: Date.now() - startTime,
        error: message,
      };
    }
  });

  const parallelResults = await Promise.all(promises);
  results.push(...parallelResults);

  return results;
};

/**
 * Run a quick review (only critical checks)
 */
export const quickReview = async (
  diffContent: string,
  options: {
    onProgress?: (message: string) => void;
  } = {},
): Promise<PRReviewReport> => {
  return reviewPR(
    diffContent,
    {
      config: {
        reviewers: [
          { name: "security", type: "security", enabled: true, minConfidence: 90 },
          { name: "logic", type: "logic", enabled: true, minConfidence: 90 },
        ],
      },
    },
    options,
  );
};

/**
 * Get review report as markdown
 */
export const getReportMarkdown = (report: PRReviewReport): string => {
  return formatReportMarkdown(report);
};

/**
 * Create a review summary for commit messages
 */
export const createReviewSummary = (report: PRReviewReport): string => {
  const parts: string[] = [];

  parts.push(`Review: ${report.rating}/5 stars`);

  if (report.findingsBySeverity.critical > 0) {
    parts.push(`${report.findingsBySeverity.critical} critical issue(s)`);
  }
  if (report.findingsBySeverity.warning > 0) {
    parts.push(`${report.findingsBySeverity.warning} warning(s)`);
  }

  return parts.join(", ");
};
