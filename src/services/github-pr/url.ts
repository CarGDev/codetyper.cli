/**
 * GitHub URL Parsing
 *
 * Parse GitHub PR URLs to extract owner, repo, and PR number.
 */

import type { PRUrlParts } from "@/types/github-pr";

/**
 * GitHub PR URL patterns
 * Matches:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pull/123/files
 * - https://github.com/owner/repo/pull/123/commits
 * - github.com/owner/repo/pull/123
 */
const PR_URL_PATTERN =
  /(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;

/**
 * Parse a GitHub PR URL to extract owner, repo, and PR number
 */
export const parsePRUrl = (url: string): PRUrlParts | null => {
  const match = url.match(PR_URL_PATTERN);

  if (!match) {
    return null;
  }

  const [, owner, repo, prNumberStr] = match;
  const prNumber = parseInt(prNumberStr, 10);

  if (isNaN(prNumber)) {
    return null;
  }

  return {
    owner,
    repo,
    prNumber,
  };
};

/**
 * Check if a string contains a GitHub PR URL
 */
export const containsPRUrl = (text: string): boolean => {
  return PR_URL_PATTERN.test(text);
};

/**
 * Extract all PR URLs from a text string
 */
export const extractPRUrls = (text: string): PRUrlParts[] => {
  const results: PRUrlParts[] = [];
  const globalPattern = new RegExp(PR_URL_PATTERN.source, "gi");
  let match;

  while ((match = globalPattern.exec(text)) !== null) {
    const [, owner, repo, prNumberStr] = match;
    const prNumber = parseInt(prNumberStr, 10);

    if (!isNaN(prNumber)) {
      results.push({ owner, repo, prNumber });
    }
  }

  return results;
};

/**
 * Build a GitHub PR URL from parts
 */
export const buildPRUrl = (parts: PRUrlParts): string => {
  return `https://github.com/${parts.owner}/${parts.repo}/pull/${parts.prNumber}`;
};
