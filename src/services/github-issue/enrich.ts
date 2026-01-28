/**
 * Message enrichment with GitHub issue context
 */

import { GITHUB_ISSUE_MESSAGES } from "@constants/github-issue";
import { extractIssueNumbers } from "@services/github-issue/extract";
import { isGitHubRepo } from "@services/github-issue/repo";
import { fetchIssues } from "@services/github-issue/fetch";
import { formatIssueContext } from "@services/github-issue/format";
import type { EnrichedMessageResult } from "@/types/github-issue";

const createEmptyResult = (message: string): EnrichedMessageResult => ({
  enrichedMessage: message,
  issues: [],
});

const buildEnrichedMessage = (
  issueContexts: string,
  originalMessage: string,
): string =>
  `${GITHUB_ISSUE_MESSAGES.CONTEXT_HEADER}${GITHUB_ISSUE_MESSAGES.SECTION_SEPARATOR}${issueContexts}${GITHUB_ISSUE_MESSAGES.SECTION_SEPARATOR}${GITHUB_ISSUE_MESSAGES.USER_REQUEST_PREFIX}${originalMessage}`;

export const enrichMessageWithIssues = async (
  message: string,
): Promise<EnrichedMessageResult> => {
  const issueNumbers = extractIssueNumbers(message);

  if (issueNumbers.length === 0) {
    return createEmptyResult(message);
  }

  const isGitHub = await isGitHubRepo();
  if (!isGitHub) {
    return createEmptyResult(message);
  }

  const issues = await fetchIssues(issueNumbers);

  if (issues.length === 0) {
    return createEmptyResult(message);
  }

  const issueContexts = issues
    .map(formatIssueContext)
    .join(GITHUB_ISSUE_MESSAGES.SECTION_SEPARATOR);

  const enrichedMessage = buildEnrichedMessage(issueContexts, message);

  return { enrichedMessage, issues };
};
