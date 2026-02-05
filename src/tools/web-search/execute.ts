/**
 * Web Search Tool Execution
 *
 * Uses Bing RSS search (no API key required, no captcha)
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
    .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
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
 * Parse Bing RSS search results
 */
const parseRssResults = (rss: string, maxResults: number): SearchResult[] => {
  const results: SearchResult[] = [];

  // Parse RSS items
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while (
    (match = itemPattern.exec(rss)) !== null &&
    results.length < maxResults
  ) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title>([^<]+)<\/title>/);
    const linkMatch = itemContent.match(/<link>([^<]+)<\/link>/);
    const descMatch = itemContent.match(/<description>([^<]*)<\/description>/);

    if (titleMatch && linkMatch) {
      results.push({
        title: decodeHtmlEntities(titleMatch[1].trim()),
        url: linkMatch[1].trim(),
        snippet: descMatch ? decodeHtmlEntities(descMatch[1].trim()) : "",
      });
    }
  }

  return results;
};

/**
 * Perform web search using Bing RSS
 */
const performSearch = async (
  query: string,
  maxResults: number,
  signal?: AbortSignal,
): Promise<SearchResult[]> => {
  const encodedQuery = encodeURIComponent(query);

  // Use Bing RSS search (no captcha, no API key required)
  const searchUrl = `https://www.bing.com/search?q=${encodedQuery}&format=rss`;

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": WEB_SEARCH_DEFAULTS.USER_AGENT,
      Accept: "application/rss+xml, text/xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  const rss = await response.text();
  return parseRssResults(rss, maxResults);
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
