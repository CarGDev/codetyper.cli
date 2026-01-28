/**
 * View tool execution (functional)
 */

import fs from "fs/promises";
import path from "path";

import { VIEW_MESSAGES, VIEW_DEFAULTS } from "@constants/view";
import type { ViewResult, FileStat } from "@/types/tools";

const createSuccessResult = (output: string): ViewResult => ({
  success: true,
  title: "View",
  output,
});

const createErrorResult = (error: unknown): ViewResult => ({
  success: false,
  title: "View failed",
  output: "",
  error: VIEW_MESSAGES.FAILED(error),
});

const extractLines = (
  content: string,
  startLine?: number,
  endLine?: number,
): string => {
  if (startLine === undefined && endLine === undefined) {
    return content;
  }

  const lines = content.split("\n");
  const start = (startLine ?? VIEW_DEFAULTS.START_LINE) - 1;
  const end = endLine ?? lines.length;
  return lines.slice(start, end).join("\n");
};

export const executeView = async (
  filePath: string,
  startLine?: number,
  endLine?: number,
): Promise<ViewResult> => {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, "utf-8");
    const output = extractLines(content, startLine, endLine);

    return createSuccessResult(output);
  } catch (error) {
    return createErrorResult(error);
  }
};

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(path.resolve(filePath));
    return true;
  } catch {
    return false;
  }
};

export const getFileStat = async (
  filePath: string,
): Promise<FileStat | null> => {
  try {
    const stats = await fs.stat(path.resolve(filePath));
    return {
      size: stats.size,
      modified: stats.mtime,
    };
  } catch {
    return null;
  }
};
