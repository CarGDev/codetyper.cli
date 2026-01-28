/**
 * Write tool execution
 */

import fs from "fs/promises";
import path from "path";

import {
  WRITE_MESSAGES,
  WRITE_TITLES,
  WRITE_DESCRIPTION,
} from "@constants/write";
import { isFileOpAllowed, promptFilePermission } from "@services/permissions";
import { formatDiff, generateDiff } from "@utils/diff";
import { writeParams } from "@tools/write/params";
import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  WriteParams,
} from "@/types/tools";

const createDeniedResult = (relativePath: string): ToolResult => ({
  success: false,
  title: WRITE_TITLES.CANCELLED(relativePath),
  output: "",
  error: WRITE_MESSAGES.PERMISSION_DENIED,
});

const createErrorResult = (relativePath: string, error: Error): ToolResult => ({
  success: false,
  title: WRITE_TITLES.FAILED(relativePath),
  output: "",
  error: error.message,
});

const createSuccessResult = (
  relativePath: string,
  fullPath: string,
  diffOutput: string,
  exists: boolean,
  content: string,
  additions: number,
  deletions: number,
): ToolResult => ({
  success: true,
  title: exists
    ? WRITE_TITLES.OVERWROTE(relativePath)
    : WRITE_TITLES.CREATED(relativePath),
  output: diffOutput,
  metadata: {
    filepath: fullPath,
    exists,
    bytes: Buffer.byteLength(content, "utf-8"),
    lines: content.split("\n").length,
    additions,
    deletions,
  },
});

const resolvePaths = (
  filePath: string,
  workingDir: string,
): { fullPath: string; relativePath: string } => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workingDir, filePath);
  const relativePath = path.relative(workingDir, fullPath);
  return { fullPath, relativePath };
};

const readExistingContent = async (
  fullPath: string,
): Promise<{ exists: boolean; content: string }> => {
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return { exists: true, content };
  } catch {
    return { exists: false, content: "" };
  }
};

const getPermissionDescription = (
  exists: boolean,
  relativePath: string,
): string =>
  exists
    ? WRITE_TITLES.OVERWRITE_DESC(relativePath)
    : WRITE_TITLES.CREATE_DESC(relativePath);

const checkPermission = async (
  fullPath: string,
  relativePath: string,
  exists: boolean,
  autoApprove: boolean,
): Promise<boolean> => {
  if (autoApprove || isFileOpAllowed("Write", fullPath)) {
    return true;
  }

  const description = getPermissionDescription(exists, relativePath);
  const { allowed } = await promptFilePermission(
    "Write",
    fullPath,
    description,
  );
  return allowed;
};

const ensureDirectory = async (fullPath: string): Promise<void> => {
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
};

const writeContent = async (
  fullPath: string,
  content: string,
): Promise<void> => {
  await fs.writeFile(fullPath, content, "utf-8");
};

export const executeWrite = async (
  args: WriteParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const { filePath, content } = args;
  const { fullPath, relativePath } = resolvePaths(filePath, ctx.workingDir);

  const { exists, content: oldContent } = await readExistingContent(fullPath);

  const allowed = await checkPermission(
    fullPath,
    relativePath,
    exists,
    ctx.autoApprove ?? false,
  );
  if (!allowed) return createDeniedResult(relativePath);

  ctx.onMetadata?.({
    title: WRITE_TITLES.WRITING(path.basename(filePath)),
    status: "running",
  });

  try {
    await ensureDirectory(fullPath);

    const diff = generateDiff(oldContent, content);
    const diffOutput = formatDiff(diff, relativePath);

    await writeContent(fullPath, content);

    return createSuccessResult(
      relativePath,
      fullPath,
      diffOutput,
      exists,
      content,
      diff.additions,
      diff.deletions,
    );
  } catch (error) {
    return createErrorResult(relativePath, error as Error);
  }
};

export const writeTool: ToolDefinition<typeof writeParams> = {
  name: "write",
  description: WRITE_DESCRIPTION,
  parameters: writeParams,
  execute: executeWrite,
};
