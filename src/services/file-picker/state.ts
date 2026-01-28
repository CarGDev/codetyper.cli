/**
 * File picker state management with Zustand vanilla
 */

import { createStore } from "zustand/vanilla";

import { FILE_PICKER_DEFAULTS } from "@constants/file-picker";
import { getFiles } from "@services/file-picker/files";
import { filterFiles } from "@services/file-picker/filter";
import type { FileEntry } from "@/types/file-picker";

interface FilePickerState {
  currentDir: string;
  cachedFiles: FileEntry[] | null;
  cwd: string;
}

const store = createStore<FilePickerState>(() => ({
  currentDir: "",
  cachedFiles: null,
  cwd: "",
}));

export const getCurrentDir = (): string => store.getState().currentDir;

export const getCwd = (): string => store.getState().cwd;

export const getCachedFiles = (): FileEntry[] | null =>
  store.getState().cachedFiles;

export const setCurrentDir = (dir: string): void => {
  store.setState({ currentDir: dir, cachedFiles: null });
};

export const setCachedFiles = (files: FileEntry[] | null): void => {
  store.setState({ cachedFiles: files });
};

export const invalidateCache = (): void => {
  store.setState({ cachedFiles: null });
};

export const initializeFilePicker = (cwd: string): void => {
  store.setState({ cwd, currentDir: cwd, cachedFiles: null });
};

export const getFilesFromState = (): FileEntry[] => {
  const { currentDir, cwd, cachedFiles } = store.getState();

  if (cachedFiles !== null) {
    return cachedFiles;
  }

  const files = getFiles(currentDir, cwd);
  setCachedFiles(files);
  return files;
};

export const filterFilesFromState = (
  query: string,
  maxResults = FILE_PICKER_DEFAULTS.MAX_RESULTS,
): FileEntry[] => {
  const { currentDir, cwd, cachedFiles } = store.getState();

  const files = cachedFiles ?? getFiles(currentDir, cwd);

  if (cachedFiles === null) {
    setCachedFiles(files);
  }

  return filterFiles(files, query, maxResults);
};

export const subscribeToFilePicker = store.subscribe;
