/**
 * Diff utility for generating colored git-style diff output
 */

export type {
  DiffLine,
  DiffHunk,
  DiffResult,
  DiffLineType,
} from "@/types/diff";
export { generateDiff } from "@utils/diff/generate";
export { formatDiff, formatCompactDiff } from "@utils/diff/format";
export { parseDiffOutput, isDiffContent, stripAnsi } from "@utils/diff/index";
