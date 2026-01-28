/**
 * Diff View Utility Functions
 */

import type { DiffLineData } from "@/types/tui";

/**
 * Strip ANSI escape codes from a string
 */
export const stripAnsi = (str: string): string => {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
};

/**
 * Check if content looks like a diff output
 */
export const isDiffContent = (content: string): boolean => {
  // Strip ANSI codes for pattern matching
  const cleanContent = stripAnsi(content);

  // Check for common diff markers (not anchored to line start due to title prefixes)
  const diffPatterns = [
    /@@\s*-\d+/m, // Hunk header
    /---\s+[ab]?\//m, // File header
    /\+\+\+\s+[ab]?\//m, // File header
  ];

  return diffPatterns.some((pattern) => pattern.test(cleanContent));
};

/**
 * Parse raw diff output into structured DiffLineData
 */
export const parseDiffOutput = (
  diffOutput: string,
): {
  lines: DiffLineData[];
  filePath?: string;
  additions: number;
  deletions: number;
} => {
  const rawLines = diffOutput.split("\n");
  const lines: DiffLineData[] = [];
  let filePath: string | undefined;
  let additions = 0;
  let deletions = 0;
  let currentOldLine = 0;
  let currentNewLine = 0;
  let inDiff = false; // Track if we're inside the diff content

  for (const rawLine of rawLines) {
    // Strip ANSI codes for parsing
    const cleanLine = stripAnsi(rawLine);

    // Skip title lines (e.g., "Edited: filename" before diff starts)
    if (
      !inDiff &&
      !cleanLine.startsWith("---") &&
      !cleanLine.startsWith("@@")
    ) {
      // Check if this looks like a title line
      if (cleanLine.match(/^(Edited|Created|Wrote|Modified|Deleted):/i)) {
        continue;
      }
      // Skip empty lines before diff starts
      if (cleanLine.trim() === "") {
        continue;
      }
    }

    // File header detection (marks start of diff)
    if (cleanLine.startsWith("--- a/") || cleanLine.startsWith("--- ")) {
      inDiff = true;
      continue; // Skip old file header
    }

    if (cleanLine.startsWith("+++ b/") || cleanLine.startsWith("+++ ")) {
      inDiff = true;
      filePath = cleanLine.replace(/^\+\+\+ [ab]?\//, "").trim();
      continue;
    }

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = cleanLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      inDiff = true;
      currentOldLine = parseInt(hunkMatch[1], 10);
      currentNewLine = parseInt(hunkMatch[2], 10);
      lines.push({ type: "hunk", content: cleanLine });
      continue;
    }

    // Only process diff content lines after we've entered the diff
    if (!inDiff) {
      continue;
    }

    // Summary line (e.g., "+5 / -3") - marks end of diff
    if (cleanLine.match(/^\+\d+\s*\/\s*-\d+$/)) {
      const summaryMatch = cleanLine.match(/^\+(\d+)\s*\/\s*-(\d+)$/);
      if (summaryMatch) {
        // Use parsed values if we haven't counted any yet
        if (additions === 0 && deletions === 0) {
          additions = parseInt(summaryMatch[1], 10);
          deletions = parseInt(summaryMatch[2], 10);
        }
      }
      continue;
    }

    // Addition line
    if (cleanLine.startsWith("+")) {
      lines.push({
        type: "add",
        content: cleanLine.slice(1),
        newLineNum: currentNewLine,
      });
      currentNewLine++;
      additions++;
      continue;
    }

    // Deletion line
    if (cleanLine.startsWith("-")) {
      lines.push({
        type: "remove",
        content: cleanLine.slice(1),
        oldLineNum: currentOldLine,
      });
      currentOldLine++;
      deletions++;
      continue;
    }

    // Context line (starts with space or is part of diff)
    if (cleanLine.startsWith(" ")) {
      lines.push({
        type: "context",
        content: cleanLine.slice(1),
        oldLineNum: currentOldLine,
        newLineNum: currentNewLine,
      });
      currentOldLine++;
      currentNewLine++;
      continue;
    }

    // Handle empty lines in diff context
    if (cleanLine === "") {
      lines.push({
        type: "context",
        content: "",
        oldLineNum: currentOldLine,
        newLineNum: currentNewLine,
      });
      currentOldLine++;
      currentNewLine++;
    }
  }

  return { lines, filePath, additions, deletions };
};
