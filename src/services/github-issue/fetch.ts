/**
 * GitHub issue fetching utilities
 */

import { exec } from "child_process";
import { promisify } from "util";

import {
  GH_CLI_COMMANDS,
  GITHUB_ISSUE_MESSAGES,
} from "@constants/github-issue";
import type { GitHubIssue, GitHubIssueApiResponse } from "@/types/github-issue";

const execAsync = promisify(exec);

const parseIssueResponse = (data: GitHubIssueApiResponse): GitHubIssue => ({
  number: data.number,
  title: data.title,
  state: data.state,
  body: data.body ?? "",
  author: data.author?.login ?? GITHUB_ISSUE_MESSAGES.UNKNOWN_AUTHOR,
  labels: data.labels?.map((l) => l.name) ?? [],
  url: data.url,
});

export const fetchIssue = async (
  issueNumber: number,
): Promise<GitHubIssue | null> => {
  try {
    const { stdout } = await execAsync(GH_CLI_COMMANDS.VIEW_ISSUE(issueNumber));
    const data = JSON.parse(stdout) as GitHubIssueApiResponse;
    return parseIssueResponse(data);
  } catch {
    return null;
  }
};

export const fetchIssues = async (
  issueNumbers: number[],
): Promise<GitHubIssue[]> => {
  const results = await Promise.all(issueNumbers.map((num) => fetchIssue(num)));

  return results.filter((issue): issue is GitHubIssue => issue !== null);
};
