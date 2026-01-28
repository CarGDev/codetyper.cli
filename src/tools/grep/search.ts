/**
 * Grep search utilities
 */

import type { GrepMatch, GrepOptions } from "@/types/tools";

const normalizeForSearch = (text: string, ignoreCase: boolean): string =>
  ignoreCase ? text.toLowerCase() : text;

const matchesPattern = (
  line: string,
  pattern: string,
  options?: GrepOptions,
): boolean => {
  if (options?.regex) {
    const regex = new RegExp(pattern, options.ignoreCase ? "i" : "");
    return regex.test(line);
  }

  const searchPattern = normalizeForSearch(
    pattern,
    options?.ignoreCase ?? false,
  );
  const searchLine = normalizeForSearch(line, options?.ignoreCase ?? false);
  return searchLine.includes(searchPattern);
};

export const searchLines = (
  lines: string[],
  pattern: string,
  file: string,
  options?: GrepOptions,
): GrepMatch[] => {
  const matches: GrepMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (matchesPattern(line, pattern, options)) {
      matches.push({
        file,
        line: i + 1,
        content: line.trim(),
      });
    }
  }

  return matches;
};

export const formatMatches = (matches: GrepMatch[]): string =>
  matches.map((m) => `${m.file}:${m.line}: ${m.content}`).join("\n");
