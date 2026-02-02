/**
 * Diff Parser
 *
 * Parses unified diff format for PR review analysis.
 */

import type { ParsedDiff, ParsedFileDiff, DiffHunk } from "@/types/pr-review";

/**
 * Diff parsing patterns
 */
const PATTERNS = {
  FILE_HEADER: /^diff --git a\/(.+) b\/(.+)$/,
  OLD_FILE: /^--- (.+?)(?:\t.*)?$/,
  NEW_FILE: /^\+\+\+ (.+?)(?:\t.*)?$/,
  HUNK_HEADER: /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/,
  BINARY: /^Binary files .+ differ$/,
  NEW_FILE_MODE: /^new file mode \d+$/,
  DELETED_FILE_MODE: /^deleted file mode \d+$/,
  RENAME_FROM: /^rename from (.+)$/,
  RENAME_TO: /^rename to (.+)$/,
} as const;

/**
 * Parse unified diff content
 */
export const parseDiff = (diffContent: string): ParsedDiff => {
  const lines = diffContent.split("\n");
  const files: ParsedFileDiff[] = [];

  let currentFile: ParsedFileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    // Git diff header
    const gitDiffMatch = line.match(PATTERNS.FILE_HEADER);
    if (gitDiffMatch) {
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }
      currentFile = createEmptyFileDiff(gitDiffMatch[1], gitDiffMatch[2]);
      currentHunk = null;
      lineIndex++;
      continue;
    }

    // Old file header
    const oldFileMatch = line.match(PATTERNS.OLD_FILE);
    if (oldFileMatch) {
      if (!currentFile) {
        currentFile = createEmptyFileDiff("", "");
      }
      currentFile.oldPath = cleanPath(oldFileMatch[1]);
      if (currentFile.oldPath === "/dev/null") {
        currentFile.isNew = true;
      }
      lineIndex++;
      continue;
    }

    // New file header
    const newFileMatch = line.match(PATTERNS.NEW_FILE);
    if (newFileMatch) {
      if (!currentFile) {
        currentFile = createEmptyFileDiff("", "");
      }
      currentFile.newPath = cleanPath(newFileMatch[1]);
      if (currentFile.newPath === "/dev/null") {
        currentFile.isDeleted = true;
      }
      lineIndex++;
      continue;
    }

    // Binary file
    if (PATTERNS.BINARY.test(line)) {
      if (currentFile) {
        currentFile.isBinary = true;
      }
      lineIndex++;
      continue;
    }

    // New file mode
    if (PATTERNS.NEW_FILE_MODE.test(line)) {
      if (currentFile) {
        currentFile.isNew = true;
      }
      lineIndex++;
      continue;
    }

    // Deleted file mode
    if (PATTERNS.DELETED_FILE_MODE.test(line)) {
      if (currentFile) {
        currentFile.isDeleted = true;
      }
      lineIndex++;
      continue;
    }

    // Rename from
    const renameFromMatch = line.match(PATTERNS.RENAME_FROM);
    if (renameFromMatch) {
      if (currentFile) {
        currentFile.isRenamed = true;
        currentFile.oldPath = cleanPath(renameFromMatch[1]);
      }
      lineIndex++;
      continue;
    }

    // Rename to
    const renameToMatch = line.match(PATTERNS.RENAME_TO);
    if (renameToMatch) {
      if (currentFile) {
        currentFile.newPath = cleanPath(renameToMatch[1]);
      }
      lineIndex++;
      continue;
    }

    // Hunk header
    const hunkMatch = line.match(PATTERNS.HUNK_HEADER);
    if (hunkMatch) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newLines: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
        content: line,
        additions: [],
        deletions: [],
        context: [],
      };
      lineIndex++;
      continue;
    }

    // Content lines
    if (currentHunk) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentHunk.additions.push(line.slice(1));
        if (currentFile) currentFile.additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        currentHunk.deletions.push(line.slice(1));
        if (currentFile) currentFile.deletions++;
      } else if (line.startsWith(" ") || line === "") {
        currentHunk.context.push(line.slice(1) || "");
      }
    }

    lineIndex++;
  }

  // Push final hunk and file
  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  // Calculate totals
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  };
};

/**
 * Create empty file diff structure
 */
const createEmptyFileDiff = (oldPath: string, newPath: string): ParsedFileDiff => ({
  oldPath: cleanPath(oldPath),
  newPath: cleanPath(newPath),
  hunks: [],
  additions: 0,
  deletions: 0,
  isBinary: false,
  isNew: false,
  isDeleted: false,
  isRenamed: false,
});

/**
 * Clean path by removing a/ or b/ prefixes
 */
const cleanPath = (path: string): string => {
  if (path.startsWith("a/")) return path.slice(2);
  if (path.startsWith("b/")) return path.slice(2);
  return path;
};

/**
 * Get the effective path for a file diff
 */
export const getFilePath = (fileDiff: ParsedFileDiff): string => {
  if (fileDiff.isNew) return fileDiff.newPath;
  if (fileDiff.isDeleted) return fileDiff.oldPath;
  return fileDiff.newPath || fileDiff.oldPath;
};

/**
 * Filter files by pattern
 */
export const filterFiles = (
  files: ParsedFileDiff[],
  excludePatterns: string[],
): ParsedFileDiff[] => {
  return files.filter((file) => {
    const path = getFilePath(file);
    return !excludePatterns.some((pattern) => matchPattern(path, pattern));
  });
};

/**
 * Simple glob pattern matching
 */
const matchPattern = (path: string, pattern: string): boolean => {
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
};

/**
 * Get added lines with line numbers
 */
export const getAddedLines = (
  fileDiff: ParsedFileDiff,
): Array<{ line: number; content: string }> => {
  const result: Array<{ line: number; content: string }> = [];

  for (const hunk of fileDiff.hunks) {
    let lineNumber = hunk.newStart;

    for (const addition of hunk.additions) {
      result.push({ line: lineNumber, content: addition });
      lineNumber++;
    }
  }

  return result;
};

/**
 * Get hunk context (surrounding code)
 */
export const getHunkContext = (
  hunk: DiffHunk,
  contextLines: number = 3,
): string => {
  const lines: string[] = [];

  // Context before
  const beforeContext = hunk.context.slice(0, contextLines);
  for (const ctx of beforeContext) {
    lines.push(` ${ctx}`);
  }

  // Changes
  for (const del of hunk.deletions) {
    lines.push(`-${del}`);
  }
  for (const add of hunk.additions) {
    lines.push(`+${add}`);
  }

  // Context after
  const afterContext = hunk.context.slice(-contextLines);
  for (const ctx of afterContext) {
    lines.push(` ${ctx}`);
  }

  return lines.join("\n");
};

/**
 * Get diff statistics
 */
export const getDiffStats = (
  diff: ParsedDiff,
): { files: number; additions: number; deletions: number; summary: string } => {
  return {
    files: diff.totalFiles,
    additions: diff.totalAdditions,
    deletions: diff.totalDeletions,
    summary: `${diff.totalFiles} file(s), +${diff.totalAdditions}/-${diff.totalDeletions}`,
  };
};
