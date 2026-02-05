/**
 * Read tool execution
 */

import fs from "fs/promises";
import path from "path";

import {
  READ_DEFAULTS,
  READ_MESSAGES,
  READ_TITLES,
  READ_DESCRIPTION,
} from "@constants/read";
import {
  isFileOpAllowed,
  promptFilePermission,
} from "@services/core/permissions";
import { readParams } from "@tools/read/params";
import { processLines } from "@tools/read/format";
import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  ReadParams,
} from "@/types/tools";

const createDeniedResult = (filePath: string): ToolResult => ({
  success: false,
  title: READ_TITLES.DENIED(filePath),
  output: "",
  error: READ_MESSAGES.PERMISSION_DENIED,
});

const createErrorResult = (filePath: string, error: Error): ToolResult => ({
  success: false,
  title: READ_TITLES.FAILED(filePath),
  output: "",
  error: error.message,
});

const createDirectoryResult = (
  filePath: string,
  files: string[],
): ToolResult => ({
  success: true,
  title: READ_TITLES.DIRECTORY(filePath),
  output: "Directory contents:\n" + files.join("\n"),
  metadata: {
    isDirectory: true,
    fileCount: files.length,
  },
});

const createFileResult = (
  filePath: string,
  fullPath: string,
  output: string,
  totalLines: number,
  linesRead: number,
  truncated: boolean,
  offset: number,
): ToolResult => ({
  success: true,
  title: path.basename(filePath),
  output,
  metadata: {
    filepath: fullPath,
    totalLines,
    linesRead,
    truncated,
    offset,
  },
});

const resolvePath = (filePath: string, workingDir: string): string =>
  path.isAbsolute(filePath) ? filePath : path.join(workingDir, filePath);

const checkPermission = async (
  fullPath: string,
  autoApprove: boolean,
): Promise<boolean> => {
  if (autoApprove || isFileOpAllowed("Read", fullPath)) {
    return true;
  }

  const { allowed } = await promptFilePermission("Read", fullPath);
  return allowed;
};

const readDirectory = async (fullPath: string): Promise<string[]> =>
  fs.readdir(fullPath);

const readFileContent = async (fullPath: string): Promise<string> =>
  fs.readFile(fullPath, "utf-8");

export const executeRead = async (
  args: ReadParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const { filePath, offset = 0, limit = READ_DEFAULTS.MAX_LINES } = args;
  const fullPath = resolvePath(filePath, ctx.workingDir);

  const allowed = await checkPermission(fullPath, ctx.autoApprove ?? false);
  if (!allowed) return createDeniedResult(filePath);

  ctx.onMetadata?.({
    title: READ_TITLES.READING(path.basename(filePath)),
    status: "running",
  });

  try {
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const files = await readDirectory(fullPath);
      return createDirectoryResult(filePath, files);
    }

    const content = await readFileContent(fullPath);
    const lines = content.split("\n");
    const { output, truncated } = processLines(lines, offset, limit);

    return createFileResult(
      filePath,
      fullPath,
      output.join("\n"),
      lines.length,
      output.length,
      truncated,
      offset,
    );
  } catch (error) {
    return createErrorResult(filePath, error as Error);
  }
};

export const readTool: ToolDefinition<typeof readParams> = {
  name: "read",
  description: READ_DESCRIPTION,
  parameters: readParams,
  execute: executeRead,
};
