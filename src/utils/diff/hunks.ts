/**
 * Diff hunk grouping utilities
 */

import { DIFF_CONTEXT_LINES } from "@constants/diff";
import type { DiffLine, DiffHunk } from "@/types/diff";

/**
 * Group diff lines into hunks with context
 */
export const groupIntoHunks = (
  lines: DiffLine[],
  contextLines = DIFF_CONTEXT_LINES,
): DiffHunk[] => {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 1;
  let newLine = 1;
  let contextBuffer: DiffLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isChange = line.type !== "context";

    if (isChange) {
      if (!currentHunk) {
        // Start new hunk with context
        const contextStart = Math.max(0, contextBuffer.length - contextLines);
        currentHunk = {
          oldStart: oldLine - (contextBuffer.length - contextStart),
          oldCount: 0,
          newStart: newLine - (contextBuffer.length - contextStart),
          newCount: 0,
          lines: contextBuffer.slice(contextStart),
        };
        currentHunk.oldCount += currentHunk.lines.length;
        currentHunk.newCount += currentHunk.lines.length;
      }

      currentHunk.lines.push(line);
      if (line.type === "remove") {
        currentHunk.oldCount++;
        oldLine++;
      } else {
        currentHunk.newCount++;
        newLine++;
      }
      contextBuffer = [];
    } else {
      if (currentHunk) {
        // Check if we should close the hunk
        let remainingChanges = false;
        for (
          let j = i + 1;
          j < lines.length && j <= i + contextLines * 2;
          j++
        ) {
          if (lines[j].type !== "context") {
            remainingChanges = true;
            break;
          }
        }

        if (remainingChanges) {
          currentHunk.lines.push(line);
          currentHunk.oldCount++;
          currentHunk.newCount++;
        } else {
          // Add trailing context and close hunk
          const trailingContext = [];
          for (let j = i; j < lines.length && j < i + contextLines; j++) {
            if (lines[j].type === "context") {
              trailingContext.push(lines[j]);
            } else {
              break;
            }
          }
          currentHunk.lines.push(...trailingContext);
          currentHunk.oldCount += trailingContext.length;
          currentHunk.newCount += trailingContext.length;
          hunks.push(currentHunk);
          currentHunk = null;
        }
      }

      contextBuffer.push(line);
      oldLine++;
      newLine++;
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
};
