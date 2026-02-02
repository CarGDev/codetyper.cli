/**
 * WebFetch Tool Constants
 *
 * Configuration for the web content fetching tool
 */

export const WEB_FETCH_DEFAULTS = {
  TIMEOUT_MS: 30000,
  MAX_CONTENT_LENGTH: 500000, // 500KB max
  USER_AGENT:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
} as const;

export const WEB_FETCH_TITLES = {
  FETCHING: (url: string) => `Fetching: ${url}`,
  SUCCESS: "Content fetched",
  FAILED: "Fetch failed",
  TIMEOUT: "Fetch timed out",
} as const;

export const WEB_FETCH_MESSAGES = {
  URL_REQUIRED: "URL is required",
  INVALID_URL: (url: string) => `Invalid URL: ${url}`,
  TIMEOUT: "Request timed out",
  FETCH_ERROR: (error: string) => `Fetch failed: ${error}`,
  CONTENT_TOO_LARGE: "Content exceeds maximum size limit",
  REDIRECT_DETECTED: (from: string, to: string) =>
    `Redirected from ${from} to ${to}`,
} as const;

export const WEB_FETCH_DESCRIPTION = `Fetch content from a URL and convert HTML to markdown.

Use this tool when you need to:
- Read documentation from a URL
- Fetch API responses
- Get content from web pages

The content will be converted to markdown for readability.
HTML will be cleaned and converted. JSON responses are formatted.

Note: This tool cannot access authenticated or private URLs.
For GitHub URLs, prefer using the \`bash\` tool with \`gh\` CLI instead.`;

// Supported content types for conversion
export const SUPPORTED_CONTENT_TYPES = {
  HTML: ["text/html", "application/xhtml+xml"],
  JSON: ["application/json", "text/json"],
  TEXT: ["text/plain", "text/markdown", "text/csv"],
  XML: ["text/xml", "application/xml"],
} as const;

// HTML elements to remove (scripts, styles, etc.)
export const HTML_REMOVE_ELEMENTS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "canvas",
  "video",
  "audio",
  "nav",
  "footer",
  "aside",
];

// HTML elements to convert to markdown
export const HTML_BLOCK_ELEMENTS = [
  "p",
  "div",
  "section",
  "article",
  "main",
  "header",
];
