/**
 * Fuzzy Matcher
 *
 * Finds patch context in target file with fuzzy matching support.
 */

import { PATCH_DEFAULTS } from "@constants/apply-patch";
import type {
  PatchHunk,
  FuzzyMatchResult,
  ContextMatchOptions,
} from "@/types/apply-patch";

/**
 * Default match options
 */
const DEFAULT_MATCH_OPTIONS: ContextMatchOptions = {
  fuzz: PATCH_DEFAULTS.FUZZ,
  ignoreWhitespace: PATCH_DEFAULTS.IGNORE_WHITESPACE,
  ignoreCase: PATCH_DEFAULTS.IGNORE_CASE,
};

/**
 * Normalize line for comparison
 */
const normalizeLine = (
  line: string,
  options: ContextMatchOptions,
): string => {
  let normalized = line;

  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, " ").trim();
  }

  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
};

/**
 * Extract context and deletion lines from hunk (lines that should exist in original)
 */
const extractOriginalLines = (hunk: PatchHunk): string[] => {
  return hunk.lines
    .filter((line) => line.type === "context" || line.type === "deletion")
    .map((line) => line.content);
};

/**
 * Check if lines match at a given position
 */
const checkMatchAtPosition = (
  fileLines: string[],
  originalLines: string[],
  startLine: number,
  options: ContextMatchOptions,
): { matches: boolean; confidence: number } => {
  let matchCount = 0;
  let totalLines = originalLines.length;

  // Can't match if we don't have enough lines
  if (startLine + originalLines.length > fileLines.length) {
    return { matches: false, confidence: 0 };
  }

  for (let i = 0; i < originalLines.length; i++) {
    const fileLine = normalizeLine(fileLines[startLine + i], options);
    const patchLine = normalizeLine(originalLines[i], options);

    if (fileLine === patchLine) {
      matchCount++;
    }
  }

  const confidence = totalLines > 0 ? matchCount / totalLines : 0;

  // Require at least (total - fuzz) lines to match
  const requiredMatches = Math.max(1, totalLines - options.fuzz);
  const matches = matchCount >= requiredMatches;

  return { matches, confidence };
};

/**
 * Find the best match position for a hunk in file content
 */
export const findHunkPosition = (
  fileContent: string,
  hunk: PatchHunk,
  options: Partial<ContextMatchOptions> = {},
): FuzzyMatchResult => {
  const fullOptions: ContextMatchOptions = {
    ...DEFAULT_MATCH_OPTIONS,
    ...options,
  };

  const fileLines = fileContent.split("\n");
  const originalLines = extractOriginalLines(hunk);

  // If hunk has no lines to match, use the line number directly
  if (originalLines.length === 0) {
    const targetLine = Math.min(hunk.oldStart - 1, fileLines.length);
    return {
      found: true,
      lineNumber: targetLine,
      offset: 0,
      confidence: 1,
    };
  }

  // Expected position (0-indexed)
  const expectedLine = hunk.oldStart - 1;

  // First, try exact position
  const exactMatch = checkMatchAtPosition(
    fileLines,
    originalLines,
    expectedLine,
    fullOptions,
  );

  if (exactMatch.matches && exactMatch.confidence === 1) {
    return {
      found: true,
      lineNumber: expectedLine,
      offset: 0,
      confidence: exactMatch.confidence,
    };
  }

  // Search within fuzz range
  const maxOffset = fullOptions.fuzz * PATCH_DEFAULTS.CONTEXT_LINES;
  let bestMatch: FuzzyMatchResult | null = null;

  for (let offset = 1; offset <= maxOffset; offset++) {
    // Try before expected position
    const beforePos = expectedLine - offset;
    if (beforePos >= 0) {
      const beforeMatch = checkMatchAtPosition(
        fileLines,
        originalLines,
        beforePos,
        fullOptions,
      );

      if (beforeMatch.matches) {
        if (!bestMatch || beforeMatch.confidence > bestMatch.confidence) {
          bestMatch = {
            found: true,
            lineNumber: beforePos,
            offset: -offset,
            confidence: beforeMatch.confidence,
          };
        }
      }
    }

    // Try after expected position
    const afterPos = expectedLine + offset;
    if (afterPos < fileLines.length) {
      const afterMatch = checkMatchAtPosition(
        fileLines,
        originalLines,
        afterPos,
        fullOptions,
      );

      if (afterMatch.matches) {
        if (!bestMatch || afterMatch.confidence > bestMatch.confidence) {
          bestMatch = {
            found: true,
            lineNumber: afterPos,
            offset: offset,
            confidence: afterMatch.confidence,
          };
        }
      }
    }

    // If we found a perfect match, stop searching
    if (bestMatch && bestMatch.confidence === 1) {
      break;
    }
  }

  // Return best match if found
  if (bestMatch) {
    return bestMatch;
  }

  // If exact position had a partial match, return it
  if (exactMatch.confidence > 0.5) {
    return {
      found: true,
      lineNumber: expectedLine,
      offset: 0,
      confidence: exactMatch.confidence,
    };
  }

  return {
    found: false,
    lineNumber: -1,
    offset: 0,
    confidence: 0,
  };
};

/**
 * Check if a hunk is already applied (deletions are gone, additions are present)
 */
export const isHunkApplied = (
  fileContent: string,
  hunk: PatchHunk,
  options: Partial<ContextMatchOptions> = {},
): boolean => {
  const fullOptions: ContextMatchOptions = {
    ...DEFAULT_MATCH_OPTIONS,
    ...options,
  };

  const fileLines = fileContent.split("\n");

  // Check if additions are present and deletions are not
  let additionsPresent = 0;
  let deletionsAbsent = 0;

  for (const line of hunk.lines) {
    const normalizedContent = normalizeLine(line.content, fullOptions);

    if (line.type === "addition") {
      const found = fileLines.some(
        (fl) => normalizeLine(fl, fullOptions) === normalizedContent,
      );
      if (found) additionsPresent++;
    }

    if (line.type === "deletion") {
      const found = fileLines.some(
        (fl) => normalizeLine(fl, fullOptions) === normalizedContent,
      );
      if (!found) deletionsAbsent++;
    }
  }

  const totalAdditions = hunk.lines.filter((l) => l.type === "addition").length;
  const totalDeletions = hunk.lines.filter((l) => l.type === "deletion").length;

  // Consider applied if most additions are present and most deletions are absent
  const additionsMatch =
    totalAdditions === 0 || additionsPresent >= totalAdditions * 0.8;
  const deletionsMatch =
    totalDeletions === 0 || deletionsAbsent >= totalDeletions * 0.8;

  return additionsMatch && deletionsMatch;
};

/**
 * Calculate the expected result of applying a hunk
 */
export const previewHunkApplication = (
  fileContent: string,
  hunk: PatchHunk,
  position: number,
): { success: boolean; preview: string[]; error?: string } => {
  const fileLines = fileContent.split("\n");
  const resultLines: string[] = [];

  // Copy lines before the hunk
  for (let i = 0; i < position; i++) {
    resultLines.push(fileLines[i]);
  }

  // Calculate how many lines to skip from the original file
  let originalLinesConsumed = 0;
  for (const line of hunk.lines) {
    if (line.type === "context" || line.type === "deletion") {
      originalLinesConsumed++;
    }
  }

  // Apply hunk transformations
  for (const line of hunk.lines) {
    if (line.type === "context") {
      resultLines.push(line.content);
    } else if (line.type === "addition") {
      resultLines.push(line.content);
    }
    // Deletions are skipped (not added to result)
  }

  // Copy lines after the hunk
  for (let i = position + originalLinesConsumed; i < fileLines.length; i++) {
    resultLines.push(fileLines[i]);
  }

  return {
    success: true,
    preview: resultLines,
  };
};
