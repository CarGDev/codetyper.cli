/**
 * GitHub PR Formatting
 *
 * Format PR data for display and context injection.
 */

import type {
  GitHubPR,
  GitHubPRComment,
  GitHubPRReview,
  GitHubPRDiff,
} from "@/types/github-pr";

/**
 * Format PR details for context
 */
export const formatPRContext = (pr: GitHubPR): string => {
  const lines: string[] = [
    `## Pull Request #${pr.number}: ${pr.title}`,
    "",
    `**Author:** ${pr.author}`,
    `**State:** ${pr.state}${pr.isDraft ? " (Draft)" : ""}`,
    `**Branch:** ${pr.headRef} → ${pr.baseRef}`,
    `**Changes:** +${pr.additions} -${pr.deletions} in ${pr.changedFiles} file(s)`,
  ];

  if (pr.labels.length > 0) {
    lines.push(`**Labels:** ${pr.labels.join(", ")}`);
  }

  if (pr.body) {
    lines.push("", "### Description", "", pr.body);
  }

  return lines.join("\n");
};

/**
 * Format PR comments for context
 */
export const formatPRComments = (comments: GitHubPRComment[]): string => {
  if (comments.length === 0) {
    return "No review comments on this PR.";
  }

  const lines: string[] = ["## Review Comments", ""];

  for (const comment of comments) {
    lines.push(`### Comment by ${comment.author}`);
    if (comment.path) {
      lines.push(`**File:** ${comment.path}${comment.line ? `:${comment.line}` : ""}`);
    }
    lines.push(`**Date:** ${new Date(comment.createdAt).toLocaleDateString()}`);
    lines.push("");

    if (comment.diffHunk) {
      lines.push("```diff");
      lines.push(comment.diffHunk);
      lines.push("```");
      lines.push("");
    }

    lines.push(comment.body);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
};

/**
 * Format PR reviews for context
 */
export const formatPRReviews = (reviews: GitHubPRReview[]): string => {
  if (reviews.length === 0) {
    return "No reviews on this PR.";
  }

  const stateEmojis: Record<GitHubPRReview["state"], string> = {
    PENDING: "⏳",
    COMMENTED: "💬",
    APPROVED: "✅",
    CHANGES_REQUESTED: "🔄",
    DISMISSED: "🚫",
  };

  const lines: string[] = ["## Reviews", ""];

  for (const review of reviews) {
    const emoji = stateEmojis[review.state] || "";
    lines.push(`### ${emoji} ${review.state} by ${review.author}`);
    lines.push(`**Date:** ${new Date(review.submittedAt).toLocaleDateString()}`);

    if (review.body) {
      lines.push("");
      lines.push(review.body);
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
};

/**
 * Format PR diff summary
 */
export const formatPRDiffSummary = (diff: GitHubPRDiff): string => {
  const lines: string[] = [
    "## Changed Files",
    "",
    "| File | Status | Changes |",
    "|------|--------|---------|",
  ];

  for (const file of diff.files) {
    const changes = `+${file.additions} -${file.deletions}`;
    lines.push(`| ${file.filename} | ${file.status} | ${changes} |`);
  }

  return lines.join("\n");
};

/**
 * Format a single comment for solving
 */
export const formatCommentForSolving = (comment: GitHubPRComment): string => {
  const lines: string[] = [
    `## Review Comment to Address`,
    "",
    `**Author:** ${comment.author}`,
  ];

  if (comment.path) {
    lines.push(`**File:** ${comment.path}`);
    if (comment.line) {
      lines.push(`**Line:** ${comment.line}`);
    }
  }

  lines.push("");
  lines.push("### Comment:");
  lines.push(comment.body);

  if (comment.diffHunk) {
    lines.push("");
    lines.push("### Code Context:");
    lines.push("```diff");
    lines.push(comment.diffHunk);
    lines.push("```");
  }

  lines.push("");
  lines.push("Please address this comment by making the necessary changes to the code.");

  return lines.join("\n");
};

/**
 * Format all comments that need addressing
 */
export const formatPendingComments = (comments: GitHubPRComment[]): string => {
  if (comments.length === 0) {
    return "No pending comments to address.";
  }

  const lines: string[] = [
    `## ${comments.length} Comment(s) to Address`,
    "",
  ];

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    lines.push(`### ${i + 1}. Comment by ${comment.author}`);

    if (comment.path) {
      lines.push(`**File:** ${comment.path}${comment.line ? `:${comment.line}` : ""}`);
    }

    lines.push("");
    lines.push(comment.body);

    if (comment.diffHunk) {
      lines.push("");
      lines.push("```diff");
      lines.push(comment.diffHunk);
      lines.push("```");
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
};
