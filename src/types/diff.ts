/**
 * Diff utility types
 */

export type DiffLineType = "add" | "remove" | "context";

export type DiffLine = {
  type: DiffLineType;
  content: string;
  lineNumber?: number;
};

export type DiffHunk = {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
};

export type DiffResult = {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
};

export type DiffOperation = {
  type: DiffLineType;
  oldIdx?: number;
  newIdx?: number;
};
