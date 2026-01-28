/**
 * File system operations for file picker
 */

import { readdirSync } from "fs";
import { join, relative, extname } from "path";

import {
  IGNORED_PATTERNS,
  BINARY_EXTENSIONS,
  FILE_PICKER_DEFAULTS,
  type IgnoredPattern,
  type BinaryExtension,
} from "@constants/file-picker";
import type { FileEntry } from "@/types/file-picker";

const isIgnoredEntry = (name: string): boolean =>
  IGNORED_PATTERNS.includes(name as IgnoredPattern);

const isHiddenAtDepth = (name: string, depth: number): boolean =>
  name.startsWith(".") && depth > 0;

const isBinaryFile = (name: string): boolean => {
  const ext = extname(name).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext as BinaryExtension);
};

const shouldSkipEntry = (
  name: string,
  depth: number,
  isDirectory: boolean,
): boolean =>
  isIgnoredEntry(name) ||
  isHiddenAtDepth(name, depth) ||
  (!isDirectory && isBinaryFile(name));

const createFileEntry = (
  name: string,
  dir: string,
  cwd: string,
  isDirectory: boolean,
): FileEntry => {
  const fullPath = join(dir, name);
  return {
    name,
    path: fullPath,
    isDirectory,
    relativePath: relative(cwd, fullPath),
  };
};

export const getFiles = (
  dir: string,
  cwd: string,
  maxDepth: number = FILE_PICKER_DEFAULTS.MAX_DEPTH,
  currentDepth: number = FILE_PICKER_DEFAULTS.INITIAL_DEPTH,
): FileEntry[] => {
  if (currentDepth > maxDepth) return [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: FileEntry[] = [];

    for (const entry of entries) {
      const isDirectory = entry.isDirectory();
      if (shouldSkipEntry(entry.name, currentDepth, isDirectory)) continue;

      files.push(createFileEntry(entry.name, dir, cwd, isDirectory));

      if (isDirectory && currentDepth < maxDepth) {
        const fullPath = join(dir, entry.name);
        files.push(...getFiles(fullPath, cwd, maxDepth, currentDepth + 1));
      }
    }

    return files;
  } catch {
    return [];
  }
};
