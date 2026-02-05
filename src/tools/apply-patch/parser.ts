/**
 * Patch Parser
 *
 * Parses unified diff format patches into structured data.
 */

import {
  PATCH_PATTERNS,
  LINE_PREFIXES,
  SPECIAL_PATHS,
  PATCH_ERRORS,
} from "@constants/apply-patch";
import type {
  ParsedPatch,
  ParsedFilePatch,
  PatchHunk,
  PatchLine,
  PatchLineType,
  PatchValidationResult,
} from "@/types/apply-patch";

/**
 * Parse a unified diff patch string
 */
export const parsePatch = (patchContent: string): ParsedPatch => {
  const lines = patchContent.split("\n");
  const files: ParsedFilePatch[] = [];

  let currentFile: ParsedFilePatch | null = null;
  let currentHunk: PatchHunk | null = null;
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    // Git diff header
    const gitDiffMatch = line.match(PATCH_PATTERNS.GIT_DIFF);
    if (gitDiffMatch) {
      if (
        currentFile &&
        (currentFile.hunks.length > 0 || currentFile.isBinary)
      ) {
        files.push(currentFile);
      }
      currentFile = createEmptyFilePatch(gitDiffMatch[1], gitDiffMatch[2]);
      currentHunk = null;
      lineIndex++;
      continue;
    }

    // File header old
    const oldHeaderMatch = line.match(PATCH_PATTERNS.FILE_HEADER_OLD);
    if (oldHeaderMatch) {
      if (!currentFile) {
        currentFile = createEmptyFilePatch("", "");
      }
      currentFile.oldPath = cleanPath(oldHeaderMatch[1]);
      if (currentFile.oldPath === SPECIAL_PATHS.DEV_NULL) {
        currentFile.isNew = true;
      }
      lineIndex++;
      continue;
    }

    // File header new
    const newHeaderMatch = line.match(PATCH_PATTERNS.FILE_HEADER_NEW);
    if (newHeaderMatch) {
      if (!currentFile) {
        currentFile = createEmptyFilePatch("", "");
      }
      currentFile.newPath = cleanPath(newHeaderMatch[1]);
      if (currentFile.newPath === SPECIAL_PATHS.DEV_NULL) {
        currentFile.isDeleted = true;
      }
      lineIndex++;
      continue;
    }

    // Index line (skip)
    if (PATCH_PATTERNS.INDEX_LINE.test(line)) {
      lineIndex++;
      continue;
    }

    // Binary file
    if (PATCH_PATTERNS.BINARY_FILE.test(line)) {
      if (currentFile) {
        currentFile.isBinary = true;
      }
      lineIndex++;
      continue;
    }

    // New file mode
    if (PATCH_PATTERNS.NEW_FILE.test(line)) {
      if (currentFile) {
        currentFile.isNew = true;
      }
      lineIndex++;
      continue;
    }

    // Deleted file mode
    if (PATCH_PATTERNS.DELETED_FILE.test(line)) {
      if (currentFile) {
        currentFile.isDeleted = true;
      }
      lineIndex++;
      continue;
    }

    // Rename from
    const renameFromMatch = line.match(PATCH_PATTERNS.RENAME_FROM);
    if (renameFromMatch) {
      if (currentFile) {
        currentFile.isRenamed = true;
        currentFile.oldPath = cleanPath(renameFromMatch[1]);
      }
      lineIndex++;
      continue;
    }

    // Rename to
    const renameToMatch = line.match(PATCH_PATTERNS.RENAME_TO);
    if (renameToMatch) {
      if (currentFile) {
        currentFile.newPath = cleanPath(renameToMatch[1]);
      }
      lineIndex++;
      continue;
    }

    // Hunk header
    const hunkMatch = line.match(PATCH_PATTERNS.HUNK_HEADER);
    if (hunkMatch) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }

      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newLines: hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1,
        lines: [],
        header: line,
      };
      lineIndex++;
      continue;
    }

    // Patch lines (context, addition, deletion)
    if (currentHunk) {
      const patchLine = parsePatchLine(line, currentHunk);
      if (patchLine) {
        currentHunk.lines.push(patchLine);
      }
    }

    lineIndex++;
  }

  // Push final hunk and file
  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile && (currentFile.hunks.length > 0 || currentFile.isBinary)) {
    files.push(currentFile);
  }

  return {
    files,
    rawPatch: patchContent,
  };
};

/**
 * Create empty file patch structure
 */
const createEmptyFilePatch = (
  oldPath: string,
  newPath: string,
): ParsedFilePatch => ({
  oldPath: cleanPath(oldPath),
  newPath: cleanPath(newPath),
  hunks: [],
  isBinary: false,
  isNew: false,
  isDeleted: false,
  isRenamed: false,
});

/**
 * Clean path by removing a/ or b/ prefixes
 */
const cleanPath = (path: string): string => {
  if (path.startsWith(SPECIAL_PATHS.A_PREFIX)) {
    return path.slice(2);
  }
  if (path.startsWith(SPECIAL_PATHS.B_PREFIX)) {
    return path.slice(2);
  }
  return path;
};

/**
 * Parse a single patch line
 */
const parsePatchLine = (line: string, _hunk: PatchHunk): PatchLine | null => {
  // No newline marker (skip but keep in mind)
  if (PATCH_PATTERNS.NO_NEWLINE.test(line)) {
    return null;
  }

  // Empty line at end of patch
  if (line === "") {
    return null;
  }

  const prefix = line[0];
  const content = line.slice(1);

  const typeMap: Record<string, PatchLineType> = {
    [LINE_PREFIXES.CONTEXT]: "context",
    [LINE_PREFIXES.ADDITION]: "addition",
    [LINE_PREFIXES.DELETION]: "deletion",
  };

  const type = typeMap[prefix];

  if (!type) {
    // Unknown line type, treat as context if it looks like content
    return {
      type: "context",
      content: line,
    };
  }

  return {
    type,
    content,
  };
};

/**
 * Validate a parsed patch
 */
export const validatePatch = (patch: ParsedPatch): PatchValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let hunkCount = 0;

  if (patch.files.length === 0) {
    errors.push(PATCH_ERRORS.INVALID_PATCH);
    return {
      valid: false,
      errors,
      warnings,
      fileCount: 0,
      hunkCount: 0,
    };
  }

  for (const file of patch.files) {
    // Check for binary files
    if (file.isBinary) {
      warnings.push(PATCH_ERRORS.BINARY_NOT_SUPPORTED);
      continue;
    }

    // Check file paths
    if (!file.newPath && !file.isDeleted) {
      errors.push(`Missing target path for file`);
    }

    // Validate hunks
    for (const hunk of file.hunks) {
      hunkCount++;

      // Count lines
      let contextCount = 0;
      let additionCount = 0;
      let deletionCount = 0;

      for (const line of hunk.lines) {
        if (line.type === "context") contextCount++;
        if (line.type === "addition") additionCount++;
        if (line.type === "deletion") deletionCount++;
      }

      // Verify hunk line counts
      const expectedOld = contextCount + deletionCount;
      const expectedNew = contextCount + additionCount;

      if (expectedOld !== hunk.oldLines) {
        warnings.push(
          `Hunk line count mismatch: expected ${hunk.oldLines} old lines, found ${expectedOld}`,
        );
      }

      if (expectedNew !== hunk.newLines) {
        warnings.push(
          `Hunk line count mismatch: expected ${hunk.newLines} new lines, found ${expectedNew}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fileCount: patch.files.length,
    hunkCount,
  };
};

/**
 * Get the target file path from a parsed file patch
 */
export const getTargetPath = (filePatch: ParsedFilePatch): string => {
  // For new files, use the new path
  if (filePatch.isNew) {
    return filePatch.newPath;
  }

  // For deleted files, use the old path
  if (filePatch.isDeleted) {
    return filePatch.oldPath;
  }

  // For renames, we want to modify the old file and rename to new
  // For regular patches, prefer newPath but fall back to oldPath
  return filePatch.newPath || filePatch.oldPath;
};

/**
 * Check if a patch appears to be reversed
 */
export const isPatchReversed = (
  patch: ParsedFilePatch,
  fileContent: string,
): boolean => {
  // Simple heuristic: check if the "added" lines are present in the file
  // and "deleted" lines are not
  const fileLines = new Set(fileContent.split("\n"));

  let addedPresent = 0;
  let deletedPresent = 0;

  for (const hunk of patch.hunks) {
    for (const line of hunk.lines) {
      if (line.type === "addition" && fileLines.has(line.content)) {
        addedPresent++;
      }
      if (line.type === "deletion" && fileLines.has(line.content)) {
        deletedPresent++;
      }
    }
  }

  // If added lines are present and deleted lines are not, patch is reversed
  return addedPresent > deletedPresent * 2;
};

/**
 * Reverse a patch (swap additions and deletions)
 */
export const reversePatch = (patch: ParsedFilePatch): ParsedFilePatch => {
  return {
    ...patch,
    oldPath: patch.newPath,
    newPath: patch.oldPath,
    isNew: patch.isDeleted,
    isDeleted: patch.isNew,
    hunks: patch.hunks.map((hunk) => ({
      ...hunk,
      oldStart: hunk.newStart,
      oldLines: hunk.newLines,
      newStart: hunk.oldStart,
      newLines: hunk.oldLines,
      lines: hunk.lines.map((line) => ({
        ...line,
        type:
          line.type === "addition"
            ? "deletion"
            : line.type === "deletion"
              ? "addition"
              : line.type,
      })),
    })),
  };
};
