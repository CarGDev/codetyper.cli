/**
 * Glob tool - list files matching patterns (functional)
 */

export {
  executeGlob,
  listFiles,
  findByExtension,
  findByName,
  listDirectories,
} from "@tools/glob/execute";

import {
  executeGlob,
  listFiles,
  findByExtension,
  findByName,
  listDirectories,
} from "@tools/glob/execute";

/**
 * Glob tool object for backward compatibility
 */
export const globTool = {
  execute: executeGlob,
  list: listFiles,
  findByExtension,
  findByName,
  listDirectories,
};
