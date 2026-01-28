/**
 * File viewing tool - read file contents (functional)
 */

export { executeView, fileExists, getFileStat } from "@tools/view/execute";

import { executeView, fileExists, getFileStat } from "@tools/view/execute";

/**
 * View tool object for backward compatibility
 */
export const viewTool = {
  execute: executeView,
  exists: fileExists,
  stat: getFileStat,
};
