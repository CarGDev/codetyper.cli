/**
 * File Picker types
 */

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  relativePath: string;
}

export interface FilePickerStoreState {
  currentDir: string;
  cachedFiles: FileEntry[] | null;
  cwd: string;
}

export interface FilePickerStoreActions {
  setCurrentDir: (dir: string) => void;
  setCachedFiles: (files: FileEntry[] | null) => void;
  invalidateCache: () => void;
  initialize: (cwd: string) => void;
}

export type FilePickerStore = FilePickerStoreState & FilePickerStoreActions;
