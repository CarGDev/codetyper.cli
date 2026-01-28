/**
 * Glob tool execution (functional)
 */

import fg from "fast-glob";

import {
  GLOB_DEFAULTS,
  GLOB_IGNORE_PATTERNS,
  GLOB_MESSAGES,
} from "@constants/glob";
import type { GlobOptions, GlobResult } from "@/types/tools";

const createSuccessResult = (files: string[]): GlobResult => ({
  success: true,
  title: "Glob",
  output: files.join("\n"),
  files,
});

const createErrorResult = (error: unknown): GlobResult => ({
  success: false,
  title: "Glob failed",
  output: "",
  error: GLOB_MESSAGES.FAILED(error),
});

export const executeGlob = async (
  patterns: string | string[],
  options?: GlobOptions,
): Promise<GlobResult> => {
  try {
    const files = await fg(patterns, {
      cwd: options?.cwd ?? process.cwd(),
      ignore: [...GLOB_IGNORE_PATTERNS, ...(options?.ignore ?? [])],
      onlyFiles: options?.onlyFiles ?? GLOB_DEFAULTS.ONLY_FILES,
      onlyDirectories:
        options?.onlyDirectories ?? GLOB_DEFAULTS.ONLY_DIRECTORIES,
      dot: GLOB_DEFAULTS.DOT,
    });

    return createSuccessResult(files);
  } catch (error) {
    return createErrorResult(error);
  }
};

export const listFiles = async (
  directory: string = ".",
  options?: {
    recursive?: boolean;
    extensions?: string[];
  },
): Promise<GlobResult> => {
  try {
    const pattern = options?.recursive ? "**/*" : "*";
    const patterns = options?.extensions
      ? options.extensions.map((ext) => `${pattern}.${ext}`)
      : [pattern];

    return executeGlob(patterns, {
      cwd: directory,
      onlyFiles: true,
    });
  } catch (error) {
    return {
      success: false,
      title: "List failed",
      output: "",
      error: GLOB_MESSAGES.LIST_FAILED(error),
    };
  }
};

export const findByExtension = async (
  extension: string,
  directory: string = ".",
): Promise<string[]> => {
  const result = await executeGlob(`**/*.${extension}`, {
    cwd: directory,
    onlyFiles: true,
  });

  return result.files ?? [];
};

export const findByName = async (
  name: string,
  directory: string = ".",
): Promise<string[]> => {
  const result = await executeGlob(`**/${name}`, {
    cwd: directory,
  });

  return result.files ?? [];
};

export const listDirectories = async (
  directory: string = ".",
): Promise<string[]> => {
  const result = await executeGlob("*", {
    cwd: directory,
    onlyDirectories: true,
  });

  return result.files ?? [];
};
