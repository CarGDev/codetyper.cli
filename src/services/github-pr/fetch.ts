/**
 * GitHub PR Data Fetching
 *
 * Fetch PR details, comments, reviews, and diffs using the gh CLI.
 */

import { spawn } from "child_process";
import { executeGHCommand } from "@services/github-pr/cli";
import type {
  GitHubPR,
  GitHubPRComment,
  GitHubPRReview,
  GitHubPRDiff,
  GitHubPRFile,
  PRUrlParts,
} from "@/types/github-pr";

const parseJSON = <T>(output: string): T | null => {
  try {
    return JSON.parse(output) as T;
  } catch {
    return null;
  }
};

const runGitCommand = (
  args: string[],
): Promise<{ exitCode: number; stdout: string }> => {
  return new Promise((resolve) => {
    const proc = spawn("git", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on("error", () => {
      resolve({ exitCode: 1, stdout: "" });
    });

    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout });
    });
  });
};

/**
 * Fetch PR details using gh CLI
 */
export const fetchPR = async (
  parts: PRUrlParts,
): Promise<GitHubPR | null> => {
  const { owner, repo, prNumber } = parts;

  const result = await executeGHCommand([
    "pr",
    "view",
    String(prNumber),
    "--repo",
    `${owner}/${repo}`,
    "--json",
    "number,title,state,body,author,headRefName,baseRefName,url,additions,deletions,changedFiles,isDraft,mergeable,labels",
  ]);

  if (!result.success) {
    return null;
  }

  interface PRApiResponse {
    number: number;
    title: string;
    state: string;
    body: string;
    author: { login: string };
    headRefName: string;
    baseRefName: string;
    url: string;
    additions: number;
    deletions: number;
    changedFiles: number;
    isDraft: boolean;
    mergeable?: string;
    labels: Array<{ name: string }>;
  }

  const data = parseJSON<PRApiResponse>(result.output);
  if (!data) {
    return null;
  }

  return {
    number: data.number,
    title: data.title,
    state: data.state as GitHubPR["state"],
    body: data.body || "",
    author: data.author?.login || "unknown",
    headRef: data.headRefName,
    baseRef: data.baseRefName,
    url: data.url,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changedFiles,
    isDraft: data.isDraft,
    mergeable: data.mergeable === "MERGEABLE",
    labels: data.labels?.map((l) => l.name) || [],
  };
};

/**
 * Fetch PR review comments (comments on specific lines of code)
 */
export const fetchPRComments = async (
  parts: PRUrlParts,
): Promise<GitHubPRComment[]> => {
  const { owner, repo, prNumber } = parts;

  const result = await executeGHCommand([
    "api",
    `repos/${owner}/${repo}/pulls/${prNumber}/comments`,
    "--jq",
    ".[] | {id: .id, author: .user.login, body: .body, path: .path, line: .line, createdAt: .created_at, diffHunk: .diff_hunk}",
  ]);

  if (!result.success) {
    return [];
  }

  // Parse newline-delimited JSON objects
  const lines = result.output.trim().split("\n").filter(Boolean);
  const comments: GitHubPRComment[] = [];

  for (const line of lines) {
    const data = parseJSON<{
      id: number;
      author: string;
      body: string;
      path?: string;
      line?: number;
      createdAt: string;
      diffHunk?: string;
    }>(line);

    if (data) {
      comments.push({
        id: data.id,
        author: data.author,
        body: data.body,
        path: data.path,
        line: data.line,
        createdAt: data.createdAt,
        diffHunk: data.diffHunk,
      });
    }
  }

  return comments;
};

/**
 * Fetch PR reviews (overall reviews with comments)
 */
export const fetchPRReviews = async (
  parts: PRUrlParts,
): Promise<GitHubPRReview[]> => {
  const { owner, repo, prNumber } = parts;

  const result = await executeGHCommand([
    "api",
    `repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    "--jq",
    ".[] | {id: .id, author: .user.login, state: .state, body: .body, submittedAt: .submitted_at}",
  ]);

  if (!result.success) {
    return [];
  }

  const lines = result.output.trim().split("\n").filter(Boolean);
  const reviews: GitHubPRReview[] = [];

  for (const line of lines) {
    const data = parseJSON<{
      id: number;
      author: string;
      state: GitHubPRReview["state"];
      body: string;
      submittedAt: string;
    }>(line);

    if (data) {
      reviews.push({
        id: data.id,
        author: data.author,
        state: data.state,
        body: data.body || "",
        submittedAt: data.submittedAt,
        comments: [], // Comments fetched separately if needed
      });
    }
  }

  return reviews;
};

/**
 * Fetch PR diff
 */
export const fetchPRDiff = async (
  parts: PRUrlParts,
): Promise<GitHubPRDiff | null> => {
  const { owner, repo, prNumber } = parts;

  // Get the diff content
  const diffResult = await executeGHCommand([
    "pr",
    "diff",
    String(prNumber),
    "--repo",
    `${owner}/${repo}`,
  ]);

  if (!diffResult.success) {
    return null;
  }

  // Get file list with stats
  const filesResult = await executeGHCommand([
    "api",
    `repos/${owner}/${repo}/pulls/${prNumber}/files`,
    "--jq",
    ".[] | {filename: .filename, status: .status, additions: .additions, deletions: .deletions, patch: .patch}",
  ]);

  const files: GitHubPRFile[] = [];

  if (filesResult.success) {
    const lines = filesResult.output.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      const data = parseJSON<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }>(line);

      if (data) {
        files.push({
          filename: data.filename,
          status: data.status as GitHubPRFile["status"],
          additions: data.additions,
          deletions: data.deletions,
          patch: data.patch,
        });
      }
    }
  }

  return {
    prNumber,
    diff: diffResult.output,
    files,
  };
};

/**
 * Get current repo's default branch for comparing PRs
 */
export const getDefaultBranch = async (): Promise<string | null> => {
  const result = await executeGHCommand([
    "repo",
    "view",
    "--json",
    "defaultBranchRef",
    "--jq",
    ".defaultBranchRef.name",
  ]);

  if (!result.success) {
    return null;
  }

  return result.output.trim() || null;
};

/**
 * Get current branch name
 */
export const getCurrentBranch = async (): Promise<string | null> => {
  const result = await runGitCommand(["branch", "--show-current"]);

  if (result.exitCode !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
};

/**
 * Get diff between current branch and default branch
 */
export const getBranchDiff = async (
  baseBranch?: string,
): Promise<string | null> => {
  const base = baseBranch || (await getDefaultBranch());
  if (!base) {
    return null;
  }

  const result = await runGitCommand(["diff", `${base}...HEAD`]);

  if (result.exitCode !== 0) {
    return null;
  }

  return result.stdout;
};
