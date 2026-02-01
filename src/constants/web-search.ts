/**
 * Web Search Tool Constants
 */

export const WEB_SEARCH_DEFAULTS = {
  MAX_RESULTS: 10,
  TIMEOUT_MS: 15000,
  USER_AGENT:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
} as const;

export const WEB_SEARCH_MESSAGES = {
  SEARCHING: (query: string) => `Searching: "${query}"`,
  NO_RESULTS: "No results found",
  SEARCH_ERROR: (error: string) => `Search failed: ${error}`,
  TIMEOUT: "Search timed out",
} as const;

export const WEB_SEARCH_TITLES = {
  SEARCHING: (query: string) => `Searching: ${query}`,
  RESULTS: (count: number) => `Found ${count} result(s)`,
  FAILED: "Search failed",
  NO_RESULTS: "No results",
} as const;

export const WEB_SEARCH_DESCRIPTION = `Search the web for information.

Use this tool to:
- Find documentation
- Look up error messages
- Research libraries and APIs
- Get current information not in your training data

Parameters:
- query: The search query string
- maxResults: Maximum number of results to return (default: 5)

Example:
- Search for "TypeScript generics tutorial"
- Search for "React useEffect cleanup function"
- Search for "bun test framework documentation"`;
