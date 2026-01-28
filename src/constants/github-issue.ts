/**
 * GitHub Issue constants
 */

export const ISSUE_PATTERNS = [
  /\bissue\s*#?(\d+)\b/gi,
  /\bfix\s+#(\d+)\b/gi,
  /\bclose\s+#(\d+)\b/gi,
  /\bresolve\s+#(\d+)\b/gi,
  /(?<!\w)#(\d+)(?!\w)/g,
] as const;

export const GITHUB_ISSUE_DEFAULTS = {
  MAX_ISSUE_NUMBER: 100000,
  MIN_ISSUE_NUMBER: 1,
} as const;

export const GITHUB_ISSUE_MESSAGES = {
  CONTEXT_HEADER: "The user is referencing the following GitHub issue(s):",
  SECTION_SEPARATOR: "\n\n---\n\n",
  USER_REQUEST_PREFIX: "User request: ",
  UNKNOWN_AUTHOR: "unknown",
} as const;

export const GH_CLI_COMMANDS = {
  GET_REMOTE_URL: "git remote get-url origin 2>/dev/null",
  VIEW_ISSUE: (issueNumber: number) =>
    `gh issue view ${issueNumber} --json number,title,state,body,author,labels,url 2>/dev/null`,
} as const;

export const GITHUB_REMOTE_IDENTIFIER = "github.com";
