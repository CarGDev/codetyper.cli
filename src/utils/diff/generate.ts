/**
 * Diff generation utilities
 */

import type { DiffResult } from "@/types/diff";
import { computeLCS } from "@utils/diff/lcs";
import { generateDiffLines } from "@utils/diff/lines";
import { groupIntoHunks } from "@utils/diff/hunks";

/**
 * Generate a diff between old and new content
 */
export const generateDiff = (
  oldContent: string,
  newContent: string,
): DiffResult => {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const dp = computeLCS(oldLines, newLines);
  const diffLines = generateDiffLines(oldLines, newLines, dp);
  const hunks = groupIntoHunks(diffLines);

  let additions = 0;
  let deletions = 0;

  for (const line of diffLines) {
    if (line.type === "add") additions++;
    if (line.type === "remove") deletions++;
  }

  return { hunks, additions, deletions };
};
