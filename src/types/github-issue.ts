/**
 * GitHub Issue types
 */

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string;
  author: string;
  labels: string[];
  url: string;
}

export interface GitHubIssueLabel {
  name: string;
}

export interface GitHubIssueApiResponse {
  number: number;
  title: string;
  state: string;
  body: string | null;
  author: { login: string } | null;
  labels: GitHubIssueLabel[] | null;
  url: string;
}

export interface EnrichedMessageResult {
  enrichedMessage: string;
  issues: GitHubIssue[];
}
