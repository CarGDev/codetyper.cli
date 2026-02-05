/**
 * GitHub Pull Request types
 */

export interface GitHubPRAuthor {
  login: string;
}

export interface GitHubPRComment {
  id: number;
  author: string;
  body: string;
  path?: string;
  line?: number;
  createdAt: string;
  diffHunk?: string;
  state?:
    | "PENDING"
    | "COMMENTED"
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "DISMISSED";
}

export interface GitHubPRReview {
  id: number;
  author: string;
  state:
    | "PENDING"
    | "COMMENTED"
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "DISMISSED";
  body: string;
  submittedAt: string;
  comments: GitHubPRComment[];
}

export interface GitHubPR {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  body: string;
  author: string;
  headRef: string;
  baseRef: string;
  url: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  isDraft: boolean;
  mergeable?: boolean;
  labels: string[];
}

export interface GitHubPRDiff {
  prNumber: number;
  diff: string;
  files: GitHubPRFile[];
}

export interface GitHubPRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface GitHubCLIStatus {
  installed: boolean;
  authenticated: boolean;
  version?: string;
  error?: string;
}

export interface PRUrlParts {
  owner: string;
  repo: string;
  prNumber: number;
}
