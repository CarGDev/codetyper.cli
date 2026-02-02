/**
 * Report Generator
 *
 * Aggregates findings and generates the review report.
 */

import {
  DEFAULT_REVIEW_CONFIG,
  SEVERITY_ICONS,
  SEVERITY_LABELS,
  FINDING_TYPE_LABELS,
  RATING_THRESHOLDS,
  RECOMMENDATION_THRESHOLDS,
  PR_REVIEW_TITLES,
} from "@constants/pr-review";
import type {
  PRReviewFinding,
  PRReviewReport,
  ReviewerResult,
  ReviewRating,
  ReviewRecommendation,
  ReviewSeverity,
  ReviewFindingType,
  ParsedDiff,
} from "@/types/pr-review";

/**
 * Generate a complete review report
 */
export const generateReport = (
  reviewerResults: ReviewerResult[],
  diff: ParsedDiff,
  options: {
    baseBranch: string;
    headBranch: string;
    commitRange: string;
  },
): PRReviewReport => {
  // Collect all findings
  const allFindings = aggregateFindings(reviewerResults);

  // Filter by confidence threshold
  const findings = filterByConfidence(
    allFindings,
    DEFAULT_REVIEW_CONFIG.minConfidence,
  );

  // Limit total findings
  const limitedFindings = limitFindings(
    findings,
    DEFAULT_REVIEW_CONFIG.maxFindings,
  );

  // Calculate statistics
  const findingsBySeverity = countBySeverity(limitedFindings);
  const findingsByType = countByType(limitedFindings);

  // Calculate rating and recommendation
  const rating = calculateRating(findingsBySeverity);
  const recommendation = calculateRecommendation(findingsBySeverity);

  // Generate summary
  const summary = generateSummary(limitedFindings, rating, recommendation);

  // Calculate duration
  const duration = reviewerResults.reduce((sum, r) => sum + r.duration, 0);

  return {
    id: generateReportId(),
    timestamp: Date.now(),
    duration,

    baseBranch: options.baseBranch,
    headBranch: options.headBranch,
    commitRange: options.commitRange,

    filesChanged: diff.totalFiles,
    additions: diff.totalAdditions,
    deletions: diff.totalDeletions,

    findings: limitedFindings,
    findingsBySeverity,
    findingsByType,

    reviewerResults,

    rating,
    recommendation,
    summary,
  };
};

/**
 * Aggregate findings from all reviewers
 */
const aggregateFindings = (results: ReviewerResult[]): PRReviewFinding[] => {
  const allFindings: PRReviewFinding[] = [];

  for (const result of results) {
    allFindings.push(...result.findings);
  }

  // Sort by severity (critical first) then by file
  return allFindings.sort((a, b) => {
    const severityOrder: Record<ReviewSeverity, number> = {
      critical: 0,
      warning: 1,
      suggestion: 2,
      nitpick: 3,
    };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.file.localeCompare(b.file);
  });
};

/**
 * Filter findings by confidence threshold
 */
const filterByConfidence = (
  findings: PRReviewFinding[],
  minConfidence: number,
): PRReviewFinding[] => {
  return findings.filter((f) => f.confidence >= minConfidence);
};

/**
 * Limit total number of findings
 */
const limitFindings = (
  findings: PRReviewFinding[],
  maxFindings: number,
): PRReviewFinding[] => {
  if (findings.length <= maxFindings) return findings;

  // Prioritize critical and warning findings
  const critical = findings.filter((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");
  const suggestions = findings.filter((f) => f.severity === "suggestion");
  const nitpicks = findings.filter((f) => f.severity === "nitpick");

  const result: PRReviewFinding[] = [];

  // Add all critical findings
  result.push(...critical);

  // Add warnings up to limit
  const remainingWarnings = maxFindings - result.length;
  result.push(...warnings.slice(0, remainingWarnings));

  // Add suggestions if room
  const remainingSuggestions = maxFindings - result.length;
  result.push(...suggestions.slice(0, remainingSuggestions));

  // Add nitpicks if room
  const remainingNitpicks = maxFindings - result.length;
  result.push(...nitpicks.slice(0, remainingNitpicks));

  return result;
};

/**
 * Count findings by severity
 */
const countBySeverity = (
  findings: PRReviewFinding[],
): Record<ReviewSeverity, number> => {
  const counts: Record<ReviewSeverity, number> = {
    critical: 0,
    warning: 0,
    suggestion: 0,
    nitpick: 0,
  };

  for (const finding of findings) {
    counts[finding.severity]++;
  }

  return counts;
};

/**
 * Count findings by type
 */
const countByType = (
  findings: PRReviewFinding[],
): Record<ReviewFindingType, number> => {
  const counts: Record<ReviewFindingType, number> = {
    security: 0,
    performance: 0,
    style: 0,
    logic: 0,
    documentation: 0,
    testing: 0,
  };

  for (const finding of findings) {
    counts[finding.type]++;
  }

  return counts;
};

/**
 * Calculate overall rating (1-5 stars)
 */
const calculateRating = (
  bySeverity: Record<ReviewSeverity, number>,
): ReviewRating => {
  for (const rating of [5, 4, 3, 2, 1] as const) {
    const threshold = RATING_THRESHOLDS[rating];
    if (
      bySeverity.critical <= threshold.maxCritical &&
      bySeverity.warning <= threshold.maxWarning
    ) {
      return rating;
    }
  }
  return 1;
};

/**
 * Calculate recommendation
 */
const calculateRecommendation = (
  bySeverity: Record<ReviewSeverity, number>,
): ReviewRecommendation => {
  if (
    bySeverity.critical === 0 &&
    bySeverity.warning === 0 &&
    bySeverity.suggestion <= RECOMMENDATION_THRESHOLDS.approve.maxSuggestion
  ) {
    return "approve";
  }

  if (
    bySeverity.critical === 0 &&
    bySeverity.warning <= RECOMMENDATION_THRESHOLDS.approve_with_suggestions.maxWarning
  ) {
    return "approve_with_suggestions";
  }

  if (bySeverity.critical >= 1) {
    return "request_changes";
  }

  return "needs_discussion";
};

/**
 * Generate summary text
 */
const generateSummary = (
  findings: PRReviewFinding[],
  _rating: ReviewRating,
  recommendation: ReviewRecommendation,
): string => {
  if (findings.length === 0) {
    return "No significant issues found. Code looks good!";
  }

  const parts: string[] = [];

  // Count by severity
  const critical = findings.filter((f) => f.severity === "critical").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const suggestions = findings.filter((f) => f.severity === "suggestion").length;

  if (critical > 0) {
    parts.push(`${critical} critical issue(s) must be addressed`);
  }

  if (warnings > 0) {
    parts.push(`${warnings} warning(s) should be reviewed`);
  }

  if (suggestions > 0) {
    parts.push(`${suggestions} suggestion(s) for improvement`);
  }

  // Add recommendation context
  const recommendationText: Record<ReviewRecommendation, string> = {
    approve: "",
    approve_with_suggestions:
      "Changes can be merged after addressing suggestions.",
    request_changes: "Critical issues must be fixed before merging.",
    needs_discussion: "Some items need clarification or discussion.",
  };

  if (recommendationText[recommendation]) {
    parts.push(recommendationText[recommendation]);
  }

  return parts.join(". ");
};

/**
 * Format report as markdown
 */
export const formatReportMarkdown = (report: PRReviewReport): string => {
  const lines: string[] = [];

  // Header
  lines.push(`## ${PR_REVIEW_TITLES.REPORT}`);
  lines.push("");

  // Summary stats
  lines.push("### ${PR_REVIEW_TITLES.SUMMARY}");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Files Changed | ${report.filesChanged} |`);
  lines.push(`| Additions | +${report.additions} |`);
  lines.push(`| Deletions | -${report.deletions} |`);
  lines.push(`| Findings | ${report.findings.length} |`);
  lines.push("");

  // Findings by severity
  lines.push("| Severity | Count |");
  lines.push("|----------|-------|");
  for (const severity of ["critical", "warning", "suggestion", "nitpick"] as const) {
    const count = report.findingsBySeverity[severity];
    if (count > 0) {
      lines.push(
        `| ${SEVERITY_ICONS[severity]} ${SEVERITY_LABELS[severity]} | ${count} |`,
      );
    }
  }
  lines.push("");

  // Rating
  const stars = "⭐".repeat(report.rating);
  lines.push(`**Rating:** ${stars} (${report.rating}/5)`);
  lines.push("");

  // Recommendation
  const recommendationEmoji: Record<ReviewRecommendation, string> = {
    approve: "✅",
    approve_with_suggestions: "✅",
    request_changes: "🔴",
    needs_discussion: "💬",
  };
  lines.push(
    `**${PR_REVIEW_TITLES.RECOMMENDATION}:** ${recommendationEmoji[report.recommendation]} ${formatRecommendation(report.recommendation)}`,
  );
  lines.push("");
  lines.push(report.summary);
  lines.push("");

  // Findings
  if (report.findings.length > 0) {
    lines.push(`### ${PR_REVIEW_TITLES.FINDINGS}`);
    lines.push("");

    for (const finding of report.findings) {
      lines.push(formatFinding(finding));
      lines.push("");
    }
  }

  return lines.join("\n");
};

/**
 * Format recommendation for display
 */
const formatRecommendation = (recommendation: ReviewRecommendation): string => {
  const labels: Record<ReviewRecommendation, string> = {
    approve: "Approve",
    approve_with_suggestions: "Approve with Suggestions",
    request_changes: "Request Changes",
    needs_discussion: "Needs Discussion",
  };
  return labels[recommendation];
};

/**
 * Format a single finding
 */
const formatFinding = (finding: PRReviewFinding): string => {
  const lines: string[] = [];

  lines.push(
    `${SEVERITY_ICONS[finding.severity]} **[${SEVERITY_LABELS[finding.severity]}]** ${FINDING_TYPE_LABELS[finding.type]}: ${finding.message}`,
  );
  lines.push("");
  lines.push(`📍 \`${finding.file}${finding.line ? `:${finding.line}` : ""}\``);

  if (finding.details) {
    lines.push("");
    lines.push(`**Issue:** ${finding.details}`);
  }

  if (finding.suggestion) {
    lines.push("");
    lines.push(`**Suggestion:** ${finding.suggestion}`);
  }

  lines.push("");
  lines.push("---");

  return lines.join("\n");
};

/**
 * Generate report ID
 */
const generateReportId = (): string => {
  return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
