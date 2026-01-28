/**
 * Grep tool - search files for patterns (functional)
 */

export { searchLines, formatMatches } from "@tools/grep/search";
export { executeGrep, searchInFile, executeRipgrep } from "@tools/grep/execute";

import { executeGrep, searchInFile, executeRipgrep } from "@tools/grep/execute";

/**
 * Grep tool object for backward compatibility
 */
export const grepTool = {
  execute: executeGrep,
  searchInFile,
  ripgrep: executeRipgrep,
};
