/**
 * File Picker Service - Filesystem operations for file selection
 *
 * This service handles all filesystem access for the FilePicker component,
 * keeping the TSX file free of side effects.
 */

export { getFiles } from "@services/file-picker/files";
export { fuzzyMatch } from "@services/file-picker/match";
export { filterFiles } from "@services/file-picker/filter";
export {
  getCurrentDir,
  getCwd,
  getCachedFiles,
  setCurrentDir,
  setCachedFiles,
  invalidateCache,
  initializeFilePicker,
  getFilesFromState,
  filterFilesFromState,
} from "@services/file-picker/state";
export type {
  FileEntry,
  FilePickerStore,
  FilePickerStoreState,
  FilePickerStoreActions,
} from "@/types/file-picker";

import { getFiles } from "@services/file-picker/files";
import { filterFiles } from "@services/file-picker/filter";
import { FILE_PICKER_DEFAULTS } from "@constants/file-picker";
import type { FileEntry } from "@/types/file-picker";

/**
 * Create a file picker state manager (legacy API for backward compatibility)
 */
export const createFilePickerState = (cwd: string) => {
  let currentDir = cwd;
  let cachedFiles: FileEntry[] | null = null;

  return {
    getCurrentDir: () => currentDir,

    setCurrentDir: (dir: string) => {
      currentDir = dir;
      cachedFiles = null;
    },

    getFiles: (): FileEntry[] => {
      if (cachedFiles === null) {
        cachedFiles = getFiles(currentDir, cwd);
      }
      return cachedFiles;
    },

    filterFiles: (
      query: string,
      maxResults = FILE_PICKER_DEFAULTS.MAX_RESULTS,
    ): FileEntry[] => {
      const files = cachedFiles ?? getFiles(currentDir, cwd);
      if (cachedFiles === null) cachedFiles = files;
      return filterFiles(files, query, maxResults);
    },

    invalidateCache: () => {
      cachedFiles = null;
    },
  };
};

export type FilePickerState = ReturnType<typeof createFilePickerState>;
