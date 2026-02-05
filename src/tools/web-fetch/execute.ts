/**
 * WebFetch Tool Execution
 *
 * Fetches content from URLs and converts HTML to markdown
 */

import {
  WEB_FETCH_DEFAULTS,
  WEB_FETCH_MESSAGES,
  WEB_FETCH_TITLES,
  WEB_FETCH_DESCRIPTION,
  HTML_REMOVE_ELEMENTS,
} from "@constants/web-fetch";
import { webFetchParams } from "@tools/web-fetch/params";
import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";
import type { WebFetchParams } from "@tools/web-fetch/params";

const createErrorResult = (error: string): ToolResult => ({
  success: false,
  title: WEB_FETCH_TITLES.FAILED,
  output: "",
  error,
});

const createSuccessResult = (
  url: string,
  content: string,
  contentType: string,
): ToolResult => ({
  success: true,
  title: WEB_FETCH_TITLES.SUCCESS,
  output: content,
  metadata: {
    url,
    contentType,
    contentLength: content.length,
  },
});

/**
 * Validate URL format
 */
const validateUrl = (url: string): URL | null => {
  try {
    const parsed = new URL(url);
    // Upgrade HTTP to HTTPS
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Remove HTML elements by tag name
 */
const removeElements = (html: string, tags: string[]): string => {
  let result = html;
  for (const tag of tags) {
    // Remove self-closing and regular tags
    const selfClosingPattern = new RegExp(`<${tag}[^>]*/>`, "gi");
    const openClosePattern = new RegExp(
      `<${tag}[^>]*>[\\s\\S]*?</${tag}>`,
      "gi",
    );
    result = result.replace(selfClosingPattern, "");
    result = result.replace(openClosePattern, "");
  }
  return result;
};

/**
 * Decode HTML entities
 */
const decodeHtmlEntities = (text: string): string => {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&rsquo;": "'",
    "&lsquo;": "'",
    "&rdquo;": '"',
    "&ldquo;": '"',
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char);
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

  return decoded;
};

/**
 * Convert HTML to markdown
 */
const htmlToMarkdown = (html: string): string => {
  // Remove unwanted elements
  let content = removeElements(html, HTML_REMOVE_ELEMENTS);

  // Extract body content if present
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1];
  }

  // Convert headers
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  content = content.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  content = content.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  content = content.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

  // Convert links
  content = content.replace(
    /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );

  // Convert images
  content = content.replace(
    /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    "![$2]($1)",
  );
  content = content.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");

  // Convert emphasis
  content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");

  // Convert code
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  content = content.replace(
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    "\n```\n$1\n```\n",
  );

  // Convert lists
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  content = content.replace(/<\/?[ou]l[^>]*>/gi, "\n");

  // Convert paragraphs and line breaks
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
  content = content.replace(/<br\s*\/?>/gi, "\n");
  content = content.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Convert blockquotes
  content = content.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, text) => {
      return text
        .split("\n")
        .map((line: string) => `> ${line}`)
        .join("\n");
    },
  );

  // Remove remaining HTML tags
  content = content.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  content = decodeHtmlEntities(content);

  // Clean up whitespace
  content = content.replace(/\n{3,}/g, "\n\n");
  content = content.replace(/[ \t]+/g, " ");
  content = content.trim();

  return content;
};

/**
 * Format JSON for readability
 */
const formatJson = (json: string): string => {
  try {
    const parsed = JSON.parse(json);
    return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
  } catch {
    return json;
  }
};

/**
 * Process content based on content type
 */
const processContent = (content: string, contentType: string): string => {
  const type = contentType.toLowerCase();

  if (type.includes("json")) {
    return formatJson(content);
  }

  if (type.includes("html") || type.includes("xhtml")) {
    return htmlToMarkdown(content);
  }

  // Plain text, markdown, etc.
  return content;
};

/**
 * Truncate content if too large
 */
const truncateContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) {
    return content;
  }

  const truncated = content.slice(0, maxLength);
  const lastNewline = truncated.lastIndexOf("\n");
  const cutPoint = lastNewline > maxLength * 0.8 ? lastNewline : maxLength;

  return (
    truncated.slice(0, cutPoint) +
    "\n\n... (content truncated, showing first " +
    Math.round(maxLength / 1000) +
    "KB)"
  );
};

/**
 * Execute web fetch
 */
export const executeWebFetch = async (
  args: WebFetchParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const { url, timeout = WEB_FETCH_DEFAULTS.TIMEOUT_MS } = args;

  if (!url || url.trim().length === 0) {
    return createErrorResult(WEB_FETCH_MESSAGES.URL_REQUIRED);
  }

  const parsedUrl = validateUrl(url);
  if (!parsedUrl) {
    return createErrorResult(WEB_FETCH_MESSAGES.INVALID_URL(url));
  }

  ctx.onMetadata?.({
    title: WEB_FETCH_TITLES.FETCHING(parsedUrl.hostname),
    status: "running",
  });

  try {
    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge with context abort signal
    ctx.abort.signal.addEventListener("abort", () => controller.abort());

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": WEB_FETCH_DEFAULTS.USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,text/plain;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return createErrorResult(
        WEB_FETCH_MESSAGES.FETCH_ERROR(`HTTP ${response.status}`),
      );
    }

    // Check for redirect to different host
    const finalUrl = new URL(response.url);
    if (finalUrl.host !== parsedUrl.host) {
      return {
        success: true,
        title: WEB_FETCH_TITLES.SUCCESS,
        output: WEB_FETCH_MESSAGES.REDIRECT_DETECTED(
          parsedUrl.host,
          finalUrl.host,
        ),
        metadata: {
          redirectUrl: response.url,
          originalUrl: url,
        },
      };
    }

    const contentType = response.headers.get("content-type") || "text/plain";
    let content = await response.text();

    // Check content length
    if (content.length > WEB_FETCH_DEFAULTS.MAX_CONTENT_LENGTH) {
      content = truncateContent(content, WEB_FETCH_DEFAULTS.MAX_CONTENT_LENGTH);
    }

    // Process content based on type
    const processed = processContent(content, contentType);

    return createSuccessResult(response.url, processed, contentType);
  } catch (error) {
    if (ctx.abort.signal.aborted) {
      return createErrorResult(WEB_FETCH_MESSAGES.TIMEOUT);
    }

    const message = error instanceof Error ? error.message : String(error);
    return createErrorResult(WEB_FETCH_MESSAGES.FETCH_ERROR(message));
  }
};

export const webFetchTool: ToolDefinition<typeof webFetchParams> = {
  name: "web_fetch",
  description: WEB_FETCH_DESCRIPTION,
  parameters: webFetchParams,
  execute: executeWebFetch,
};
