/**
 * Diff line generation utilities
 */

import type { DiffLine, DiffOperation } from "@/types/diff";

/**
 * Generate diff lines from LCS matrix
 */
export const generateDiffLines = (
  oldLines: string[],
  newLines: string[],
  dp: number[][],
): DiffLine[] => {
  const result: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  const ops: DiffOperation[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({ type: "context", oldIdx: i - 1, newIdx: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: "add", newIdx: j - 1 });
      j--;
    } else {
      ops.unshift({ type: "remove", oldIdx: i - 1 });
      i--;
    }
  }

  for (const op of ops) {
    if (op.type === "context" && op.oldIdx !== undefined) {
      result.push({ type: "context", content: oldLines[op.oldIdx] });
    } else if (op.type === "remove" && op.oldIdx !== undefined) {
      result.push({ type: "remove", content: oldLines[op.oldIdx] });
    } else if (op.type === "add" && op.newIdx !== undefined) {
      result.push({ type: "add", content: newLines[op.newIdx] });
    }
  }

  return result;
};
