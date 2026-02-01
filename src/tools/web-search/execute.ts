/**
 * Web Search Tool Execution
 *
 * Uses DuckDuckGo HTML search (no API key required)
 */

import {
  WEB_SEARCH_DEFAULTS,
  WEB_SEARCH_MESSAGES,
  WEB_SEARCH_TITLES,
  WEB_SEARCH_DESCRIPTION,
} from "@constants/web-search";
import { webSearchParams } from "@tools/web-search/params";
import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";
import type { WebSearchParams } from "@tools/web-search/params";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const createErrorResult = (error: string): ToolResult => ({
  success: false,
  title: WEB_SEARCH_TITLES.FAILED,
  output: "",
  error,
});

const createNoResultsResult = (query: string): ToolResult => ({
  success: true,
  title: WEB_SEARCH_TITLES.NO_RESULTS,
  output: `No results found for: "${query}"`,
});

const createSuccessResult = (
  results: SearchResult[],
  query: string,
): ToolResult => {
  const formattedResults = results
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`,
    )
    .join("\n\n");

  return {
    success: true,
    title: WEB_SEARCH_TITLES.RESULTS(results.length),
    output: `Search results for "${query}":\n\n${formattedResults}`,
    metadata: {
      query,
      resultCount: results.length,
    },
  };
};

/**
 * Parse DuckDuckGo HTML search results
 */
const parseSearchResults = (html: string, maxResults: number): SearchResult[] => {
  const results: SearchResult[] = [];

  // DuckDuckGo lite HTML structure parsing
  // Look for result links and snippets
  const resultPattern =
    /<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<td[^>]*class="result-snippet"[^>]*>([^<]+)/gi;

  // Alternative pattern for standard DuckDuckGo HTML
  const altPattern =
    /<a[^>]+rel="nofollow"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<span[^>]*>([^<]{20,})/gi;

  // Try result-link pattern first
  let match: RegExpExecArray | null;
  while ((match = resultPattern.exec(html)) !== null && results.length < maxResults) {
    const [, url, title, snippet] = match;
    if (url && title && !url.includes("duckduckgo.com")) {
      results.push({
        title: decodeHtmlEntities(title.trim()),
        url: decodeUrl(url),
        snippet: decodeHtmlEntities(snippet.trim()),
      });
    }
  }

  // If no results, try alternative pattern
  if (results.length === 0) {
    while ((match = altPattern.exec(html)) !== null && results.length < maxResults) {
      const [, url, title, snippet] = match;
      if (url && title && !url.includes("duckduckgo.com")) {
        results.push({
          title: decodeHtmlEntities(title.trim()),
          url: decodeUrl(url),
          snippet: decodeHtmlEntities(snippet.trim()),
        });
      }
    }
  }

  // Fallback: extract any external links with reasonable text
  if (results.length === 0) {
    const linkPattern = /<a[^>]+href="(https?:\/\/(?!duckduckgo)[^"]+)"[^>]*>([^<]{10,100})<\/a>/gi;
    const seenUrls = new Set<string>();

    while ((match = linkPattern.exec(html)) !== null && results.length < maxResults) {
      const [, url, title] = match;
      if (!seenUrls.has(url) && !url.includes("duckduckgo")) {
        seenUrls.add(url);
        results.push({
          title: decodeHtmlEntities(title.trim()),
          url: decodeUrl(url),
          snippet: "",
        });
      }
    }
  }

  return results;
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
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char);
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );

  return decoded;
};

/**
 * Decode DuckDuckGo redirect URLs
 */
const decodeUrl = (url: string): string => {
  // DuckDuckGo often wraps URLs in redirects
  if (url.includes("uddg=")) {
    const match = url.match(/uddg=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return url;
};

/**
 * Perform web search using DuckDuckGo
 */
const performSearch = async (
  query: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<SearchResult[]> => {
  const encodedQuery = encodeURIComponent(query);

  // Use DuckDuckGo HTML search (lite version for easier parsing)
  const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": WEB_SEARCH_DEFAULTS.USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  const html = await response.text();
  return parseSearchResults(html, maxResults);
};

/**
 * Execute web search
 */
export const executeWebSearch = async (
  args: WebSearchParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const { query, maxResults = 5 } = args;

  if (!query || query.trim().length === 0) {
    return createErrorResult("Search query is required");
  }

  ctx.onMetadata?.({
    title: WEB_SEARCH_TITLES.SEARCHING(query),
    status: "running",
  });

  try {
    // Create timeout with abort signal
    const timeoutId = setTimeout(
      () => ctx.abort.abort(),
      WEB_SEARCH_DEFAULTS.TIMEOUT_MS,
    );

    const results = await performSearch(query, maxResults, ctx.abort.signal);

    clearTimeout(timeoutId);

    if (results.length === 0) {
      return createNoResultsResult(query);
    }

    return createSuccessResult(results, query);
  } catch (error) {
    if (ctx.abort.signal.aborted) {
      return createErrorResult(WEB_SEARCH_MESSAGES.TIMEOUT);
    }

    const message = error instanceof Error ? error.message : String(error);
    return createErrorResult(WEB_SEARCH_MESSAGES.SEARCH_ERROR(message));
  }
};

export const webSearchTool: ToolDefinition<typeof webSearchParams> = {
  name: "web_search",
  description: WEB_SEARCH_DESCRIPTION,
  parameters: webSearchParams,
  execute: executeWebSearch,
};
