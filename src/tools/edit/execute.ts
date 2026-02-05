/**
 * Edit tool execution
 */

import fs from "fs/promises";
import path from "path";

import { EDIT_MESSAGES, EDIT_TITLES, EDIT_DESCRIPTION } from "@constants/edit";
import {
  isFileOpAllowed,
  promptFilePermission,
} from "@services/core/permissions";
import { formatDiff } from "@utils/diff/format";
import { generateDiff } from "@utils/diff/generate";
import { editParams } from "@tools/edit/params";
import {
  validateTextExists,
  validateUniqueness,
  countOccurrences,
} from "@tools/edit/validate";
import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  EditParams,
} from "@/types/tools";

const createDeniedResult = (relativePath: string): ToolResult => ({
  success: false,
  title: EDIT_TITLES.CANCELLED(relativePath),
  output: "",
  error: EDIT_MESSAGES.PERMISSION_DENIED,
});

const createErrorResult = (relativePath: string, error: Error): ToolResult => ({
  success: false,
  title: EDIT_TITLES.FAILED(relativePath),
  output: "",
  error: error.message,
});

const createSuccessResult = (
  relativePath: string,
  fullPath: string,
  diffOutput: string,
  replacements: number,
  additions: number,
  deletions: number,
): ToolResult => ({
  success: true,
  title: EDIT_TITLES.SUCCESS(relativePath),
  output: diffOutput,
  metadata: {
    filepath: fullPath,
    replacements,
    additions,
    deletions,
  },
});

const resolvePath = (
  filePath: string,
  workingDir: string,
): { fullPath: string; relativePath: string } => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workingDir, filePath);
  const relativePath = path.relative(workingDir, fullPath);
  return { fullPath, relativePath };
};

const checkPermission = async (
  fullPath: string,
  relativePath: string,
  autoApprove: boolean,
): Promise<boolean> => {
  if (autoApprove || isFileOpAllowed("Edit", fullPath)) {
    return true;
  }

  const { allowed } = await promptFilePermission(
    "Edit",
    fullPath,
    `Edit file: ${relativePath}`,
  );
  return allowed;
};

const applyEdit = (
  content: string,
  oldString: string,
  newString: string,
  replaceAll: boolean,
): string =>
  replaceAll
    ? content.split(oldString).join(newString)
    : content.replace(oldString, newString);

export const executeEdit = async (
  args: EditParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const { filePath, oldString, newString, replaceAll = false } = args;
  const { fullPath, relativePath } = resolvePath(filePath, ctx.workingDir);

  try {
    const content = await fs.readFile(fullPath, "utf-8");

    const existsError = validateTextExists(content, oldString, relativePath);
    if (existsError) return existsError;

    const uniqueError = validateUniqueness(
      content,
      oldString,
      replaceAll,
      relativePath,
    );
    if (uniqueError) return uniqueError;

    const allowed = await checkPermission(
      fullPath,
      relativePath,
      ctx.autoApprove ?? false,
    );
    if (!allowed) return createDeniedResult(relativePath);

    ctx.onMetadata?.({
      title: EDIT_TITLES.EDITING(path.basename(filePath)),
      status: "running",
    });

    const newContent = applyEdit(content, oldString, newString, replaceAll);
    const diff = generateDiff(content, newContent);
    const diffOutput = formatDiff(diff, relativePath);

    await fs.writeFile(fullPath, newContent, "utf-8");

    const replacements = replaceAll ? countOccurrences(content, oldString) : 1;

    return createSuccessResult(
      relativePath,
      fullPath,
      diffOutput,
      replacements,
      diff.additions,
      diff.deletions,
    );
  } catch (error) {
    return createErrorResult(relativePath, error as Error);
  }
};

export const editTool: ToolDefinition<typeof editParams> = {
  name: "edit",
  description: EDIT_DESCRIPTION,
  parameters: editParams,
  execute: executeEdit,
};
