/**
 * Grep tool execution (functional)
 */

import { exec } from "child_process";
import { promisify } from "util";
import fg from "fast-glob";
import fs from "fs/promises";

import {
  GREP_DEFAULTS,
  GREP_IGNORE_PATTERNS,
  GREP_MESSAGES,
  GREP_COMMANDS,
} from "@constants/grep";
import { searchLines, formatMatches } from "@tools/grep/search";
import type { GrepMatch, GrepOptions, GrepResult } from "@/types/tools";

const execAsync = promisify(exec);

const createSuccessResult = (output: string, files: string[]): GrepResult => ({
  success: true,
  title: "Grep",
  output: output || GREP_MESSAGES.NO_MATCHES,
  files,
});

const createErrorResult = (error: unknown): GrepResult => ({
  success: false,
  title: "Grep failed",
  output: "",
  error: GREP_MESSAGES.SEARCH_FAILED(error),
});

const searchFile = async (
  file: string,
  pattern: string,
  options?: GrepOptions,
): Promise<GrepMatch[]> => {
  try {
    const content = await fs.readFile(file, "utf-8");
    const lines = content.split("\n");
    return searchLines(lines, pattern, file, options);
  } catch {
    return [];
  }
};

export const executeGrep = async (
  pattern: string,
  files: string[] = [GREP_DEFAULTS.DEFAULT_PATTERN],
  options?: GrepOptions,
): Promise<GrepResult> => {
  try {
    const fileList = await fg(files, {
      ignore: [...GREP_IGNORE_PATTERNS],
    });

    const matches: GrepMatch[] = [];
    const maxResults = options?.maxResults ?? GREP_DEFAULTS.MAX_RESULTS;

    for (const file of fileList) {
      if (matches.length >= maxResults) break;

      const fileMatches = await searchFile(file, pattern, options);
      const remaining = maxResults - matches.length;
      matches.push(...fileMatches.slice(0, remaining));
    }

    const output = formatMatches(matches);
    const uniqueFiles = [...new Set(matches.map((m) => m.file))];

    return createSuccessResult(output, uniqueFiles);
  } catch (error) {
    return createErrorResult(error);
  }
};

export const searchInFile = async (
  filePath: string,
  pattern: string,
  options?: GrepOptions,
): Promise<GrepMatch[]> => searchFile(filePath, pattern, options);

export const executeRipgrep = async (
  pattern: string,
  directory: string = ".",
): Promise<GrepResult> => {
  try {
    const { stdout } = await execAsync(
      GREP_COMMANDS.RIPGREP(pattern, directory),
    );

    return {
      success: true,
      title: "Ripgrep",
      output: stdout || GREP_MESSAGES.NO_MATCHES,
    };
  } catch (error: unknown) {
    const execError = error as { code?: number; message?: string };

    if (execError.code === GREP_DEFAULTS.NO_MATCHES_EXIT_CODE) {
      return {
        success: true,
        title: "Ripgrep",
        output: GREP_MESSAGES.NO_MATCHES,
      };
    }

    return {
      success: false,
      title: "Ripgrep failed",
      output: "",
      error: GREP_MESSAGES.RIPGREP_FAILED(execError.message ?? "Unknown error"),
    };
  }
};
