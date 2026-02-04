/**
 * MultiEdit Tool Execution
 *
 * Performs batch file editing with atomic transactions
 */

import fs from "fs/promises";
import path from "path";

import {
  MULTI_EDIT_DEFAULTS,
  MULTI_EDIT_MESSAGES,
  MULTI_EDIT_TITLES,
  MULTI_EDIT_DESCRIPTION,
} from "@constants/multi-edit";
import { isFileOpAllowed, promptFilePermission } from "@services/core/permissions";
import { formatDiff } from "@utils/diff/format";
import { generateDiff } from "@utils/diff/generate";
import { multiEditParams } from "@tools/multi-edit/params";
import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";
import type { EditItem, MultiEditParams } from "@tools/multi-edit/params";

interface FileBackup {
  path: string;
  content: string;
}

interface EditValidation {
  valid: boolean;
  error?: string;
  fileContent?: string;
}

interface EditResult {
  path: string;
  success: boolean;
  diff?: string;
  additions?: number;
  deletions?: number;
  error?: string;
}

const createErrorResult = (error: string): ToolResult => ({
  success: false,
  title: MULTI_EDIT_TITLES.FAILED,
  output: "",
  error,
});

const createSuccessResult = (
  results: EditResult[],
  totalEdits: number,
): ToolResult => {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const diffOutput = successful
    .map((r) => `## ${path.basename(r.path)}\n\n${r.diff}`)
    .join("\n\n---\n\n");

  const totalAdditions = successful.reduce(
    (sum, r) => sum + (r.additions ?? 0),
    0,
  );
  const totalDeletions = successful.reduce(
    (sum, r) => sum + (r.deletions ?? 0),
    0,
  );

  const title =
    failed.length > 0
      ? MULTI_EDIT_TITLES.PARTIAL(successful.length, failed.length)
      : MULTI_EDIT_TITLES.SUCCESS(successful.length);

  let output = diffOutput;
  if (failed.length > 0) {
    output +=
      "\n\n## Failed Edits\n\n" +
      failed.map((r) => `- ${r.path}: ${r.error}`).join("\n");
  }

  return {
    success: failed.length === 0,
    title,
    output,
    metadata: {
      totalEdits,
      successful: successful.length,
      failed: failed.length,
      totalAdditions,
      totalDeletions,
    },
  };
};

/**
 * Validate a single edit
 */
const validateEdit = async (
  edit: EditItem,
  workingDir: string,
): Promise<EditValidation> => {
  const fullPath = path.isAbsolute(edit.file_path)
    ? edit.file_path
    : path.join(workingDir, edit.file_path);

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return { valid: false, error: `Not a file: ${edit.file_path}` };
    }

    if (stat.size > MULTI_EDIT_DEFAULTS.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: MULTI_EDIT_MESSAGES.FILE_TOO_LARGE(edit.file_path),
      };
    }

    const content = await fs.readFile(fullPath, "utf-8");

    // Check if old_string exists
    if (!content.includes(edit.old_string)) {
      const preview = edit.old_string.slice(0, 50);
      return {
        valid: false,
        error: MULTI_EDIT_MESSAGES.OLD_STRING_NOT_FOUND(
          edit.file_path,
          preview,
        ),
      };
    }

    // Check uniqueness
    const occurrences = content.split(edit.old_string).length - 1;
    if (occurrences > 1) {
      return {
        valid: false,
        error: MULTI_EDIT_MESSAGES.OLD_STRING_NOT_UNIQUE(
          edit.file_path,
          occurrences,
        ),
      };
    }

    return { valid: true, fileContent: content };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        valid: false,
        error: MULTI_EDIT_MESSAGES.FILE_NOT_FOUND(edit.file_path),
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: message };
  }
};

/**
 * Check permissions for all files
 */
const checkPermissions = async (
  edits: EditItem[],
  workingDir: string,
  autoApprove: boolean,
): Promise<{ allowed: boolean; denied: string[] }> => {
  const denied: string[] = [];

  for (const edit of edits) {
    const fullPath = path.isAbsolute(edit.file_path)
      ? edit.file_path
      : path.join(workingDir, edit.file_path);

    if (!autoApprove && !isFileOpAllowed("Edit", fullPath)) {
      const { allowed } = await promptFilePermission(
        "Edit",
        fullPath,
        `Edit file: ${edit.file_path}`,
      );
      if (!allowed) {
        denied.push(edit.file_path);
      }
    }
  }

  return { allowed: denied.length === 0, denied };
};

/**
 * Apply a single edit
 */
const applyEdit = async (
  edit: EditItem,
  workingDir: string,
  fileContent: string,
): Promise<EditResult> => {
  const fullPath = path.isAbsolute(edit.file_path)
    ? edit.file_path
    : path.join(workingDir, edit.file_path);

  try {
    const newContent = fileContent.replace(edit.old_string, edit.new_string);
    const diff = generateDiff(fileContent, newContent);
    const relativePath = path.relative(workingDir, fullPath);
    const diffOutput = formatDiff(diff, relativePath);

    await fs.writeFile(fullPath, newContent, "utf-8");

    return {
      path: edit.file_path,
      success: true,
      diff: diffOutput,
      additions: diff.additions,
      deletions: diff.deletions,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      path: edit.file_path,
      success: false,
      error: message,
    };
  }
};

/**
 * Rollback changes using backups
 */
const rollback = async (backups: FileBackup[]): Promise<void> => {
  for (const backup of backups) {
    try {
      await fs.writeFile(backup.path, backup.content, "utf-8");
    } catch {
      // Best effort rollback
    }
  }
};

/**
 * Execute multi-edit
 */
export const executeMultiEdit = async (
  args: MultiEditParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const { edits } = args;

  // Validate edit count
  if (edits.length === 0) {
    return createErrorResult(MULTI_EDIT_MESSAGES.NO_EDITS);
  }

  if (edits.length > MULTI_EDIT_DEFAULTS.MAX_EDITS) {
    return createErrorResult(
      MULTI_EDIT_MESSAGES.TOO_MANY_EDITS(MULTI_EDIT_DEFAULTS.MAX_EDITS),
    );
  }

  ctx.onMetadata?.({
    title: MULTI_EDIT_TITLES.VALIDATING(edits.length),
    status: "running",
  });

  // Phase 1: Validate all edits
  const validations = new Map<
    string,
    { validation: EditValidation; edit: EditItem }
  >();
  const errors: string[] = [];

  for (const edit of edits) {
    const validation = await validateEdit(edit, ctx.workingDir);
    validations.set(edit.file_path, { validation, edit });

    if (!validation.valid) {
      errors.push(validation.error ?? "Unknown error");
    }
  }

  if (errors.length > 0) {
    return createErrorResult(
      MULTI_EDIT_MESSAGES.VALIDATION_FAILED + ":\n" + errors.join("\n"),
    );
  }

  // Phase 2: Check permissions
  const permCheck = await checkPermissions(
    edits,
    ctx.workingDir,
    ctx.autoApprove ?? false,
  );

  if (!permCheck.allowed) {
    return createErrorResult(
      `Permission denied for: ${permCheck.denied.join(", ")}`,
    );
  }

  // Phase 3: Create backups and apply edits atomically
  const backups: FileBackup[] = [];
  const results: EditResult[] = [];
  let failed = false;

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const data = validations.get(edit.file_path);
    if (!data?.validation.fileContent) continue;

    ctx.onMetadata?.({
      title: MULTI_EDIT_TITLES.APPLYING(i + 1, edits.length),
      status: "running",
    });

    const fullPath = path.isAbsolute(edit.file_path)
      ? edit.file_path
      : path.join(ctx.workingDir, edit.file_path);

    // Create backup
    backups.push({
      path: fullPath,
      content: data.validation.fileContent,
    });

    // Apply edit
    const result = await applyEdit(
      edit,
      ctx.workingDir,
      data.validation.fileContent,
    );
    results.push(result);

    if (!result.success) {
      failed = true;
      break;
    }

    // Update file content for subsequent edits to same file
    if (result.success) {
      const newContent = data.validation.fileContent.replace(
        edit.old_string,
        edit.new_string,
      );
      // Update the validation cache for potential subsequent edits to same file
      validations.set(edit.file_path, {
        ...data,
        validation: { ...data.validation, fileContent: newContent },
      });
    }
  }

  // Phase 4: Rollback if any edit failed
  if (failed) {
    ctx.onMetadata?.({
      title: MULTI_EDIT_TITLES.ROLLBACK,
      status: "running",
    });
    await rollback(backups);
    return createErrorResult(MULTI_EDIT_MESSAGES.ATOMIC_FAILURE);
  }

  return createSuccessResult(results, edits.length);
};

export const multiEditTool: ToolDefinition<typeof multiEditParams> = {
  name: "multi_edit",
  description: MULTI_EDIT_DESCRIPTION,
  parameters: multiEditParams,
  execute: executeMultiEdit,
};
