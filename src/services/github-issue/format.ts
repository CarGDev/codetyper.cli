/**
 * GitHub issue formatting utilities
 */

import type { GitHubIssue } from "@/types/github-issue";

const formatLabels = (labels: string[]): string =>
  labels.length > 0 ? `\nLabels: ${labels.join(", ")}` : "";

export const formatIssueContext = (issue: GitHubIssue): string => {
  const labelStr = formatLabels(issue.labels);

  return `## GitHub Issue #${issue.number}: ${issue.title}
State: ${issue.state}
Author: ${issue.author}${labelStr}
URL: ${issue.url}

${issue.body}`;
};
