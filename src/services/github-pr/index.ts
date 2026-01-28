/**
 * GitHub PR Service
 *
 * Service for interacting with GitHub Pull Requests using the gh CLI.
 */

export { checkGitHubCLI, clearCLIStatusCache, executeGHCommand } from "@services/github-pr/cli";

export {
  parsePRUrl,
  containsPRUrl,
  extractPRUrls,
  buildPRUrl,
} from "@services/github-pr/url";

export {
  fetchPR,
  fetchPRComments,
  fetchPRReviews,
  fetchPRDiff,
  getDefaultBranch,
  getCurrentBranch,
  getBranchDiff,
} from "@services/github-pr/fetch";

export {
  formatPRContext,
  formatPRComments,
  formatPRReviews,
  formatPRDiffSummary,
  formatCommentForSolving,
  formatPendingComments,
} from "@services/github-pr/format";

export type {
  GitHubPR,
  GitHubPRComment,
  GitHubPRReview,
  GitHubPRDiff,
  GitHubPRFile,
  GitHubCLIStatus,
  PRUrlParts,
} from "@/types/github-pr";
