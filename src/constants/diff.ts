/**
 * Diff utility constants
 */

// Default context lines for hunks
export const DIFF_CONTEXT_LINES = 3;

// Line type prefixes
export const LINE_PREFIXES = {
  add: "+",
  remove: "-",
  context: " ",
} as const;
