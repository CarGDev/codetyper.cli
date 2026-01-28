/**
 * GitHub Issue Service - Fetches issue details from the current repo
 *
 * Recognizes issue references in user messages and enriches them with
 * actual issue content from GitHub.
 */

export { extractIssueNumbers } from "@services/github-issue/extract";
export { isGitHubRepo } from "@services/github-issue/repo";
export { fetchIssue, fetchIssues } from "@services/github-issue/fetch";
export { formatIssueContext } from "@services/github-issue/format";
export { enrichMessageWithIssues } from "@services/github-issue/enrich";
export type {
  GitHubIssue,
  GitHubIssueLabel,
  GitHubIssueApiResponse,
  EnrichedMessageResult,
} from "@/types/github-issue";
