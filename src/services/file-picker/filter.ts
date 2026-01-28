/**
 * File filtering utilities for file picker
 */

import { FILE_PICKER_DEFAULTS } from "@constants/file-picker";
import { fuzzyMatch } from "@services/file-picker/match";
import type { FileEntry } from "@/types/file-picker";

export const filterFiles = (
  files: FileEntry[],
  query: string,
  maxResults = FILE_PICKER_DEFAULTS.MAX_RESULTS,
): FileEntry[] => {
  if (!query) return files.slice(0, maxResults);

  return files
    .filter((f) => fuzzyMatch(query, f.relativePath))
    .slice(0, maxResults);
};
