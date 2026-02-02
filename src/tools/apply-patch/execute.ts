/**
 * Apply Patch Execution
 *
 * Applies unified diff patches to files with fuzzy matching and rollback support.
 */

import fs from "fs/promises";
import { dirname, join, isAbsolute } from "path";
import {
  PATCH_DEFAULTS,
  PATCH_ERRORS,
  PATCH_MESSAGES,
  PATCH_TITLES,
} from "@constants/apply-patch";
import { parsePatch, validatePatch, getTargetPath, reversePatch } from "@tools/apply-patch/parser";
import { findHunkPosition, isHunkApplied, previewHunkApplication } from "@tools/apply-patch/matcher";
import type { ApplyPatchParams } from "@tools/apply-patch/params";
import type {
  FilePatchResult,
  HunkApplicationResult,
  PatchRollback,
  ParsedFilePatch,
} from "@/types/apply-patch";
import type { ToolContext, ToolResult } from "@tools/types";

// Rollback storage (in-memory for session)
const rollbackStore: Map<string, PatchRollback> = new Map();

/**
 * Execute the apply_patch tool
 */
export const executeApplyPatch = async (
  params: ApplyPatchParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  try {
    // Parse the patch
    const parsedPatch = parsePatch(params.patch);

    // Validate the patch
    const validation = validatePatch(parsedPatch);
    if (!validation.valid) {
      return {
        success: false,
        title: PATCH_TITLES.FAILED,
        output: "",
        error: validation.errors.join("\n"),
      };
    }

    // Apply to each file
    const results: FilePatchResult[] = [];
    let totalPatched = 0;
    let totalFailed = 0;

    for (let filePatch of parsedPatch.files) {
      // Skip binary files
      if (filePatch.isBinary) {
        results.push({
          success: true,
          filePath: getTargetPath(filePatch),
          hunksApplied: 0,
          hunksFailed: 0,
          hunkResults: [],
          error: PATCH_MESSAGES.SKIPPED_BINARY(getTargetPath(filePatch)),
        });
        continue;
      }

      // Reverse if requested
      if (params.reverse) {
        filePatch = reversePatch(filePatch);
      }

      // Determine target file path
      const targetPath = params.targetFile ?? getTargetPath(filePatch);
      const absolutePath = isAbsolute(targetPath)
        ? targetPath
        : join(ctx.workingDir, targetPath);

      // Apply the file patch
      const result = await applyFilePatch(
        filePatch,
        absolutePath,
        {
          fuzz: params.fuzz ?? PATCH_DEFAULTS.FUZZ,
          dryRun: params.dryRun ?? false,
        },
      );

      results.push(result);

      if (result.success) {
        totalPatched++;
      } else {
        totalFailed++;
      }
    }

    // Build output
    const output = formatPatchResults(results, params.dryRun ?? false);

    // Determine overall success
    const success = totalFailed === 0;
    const title = params.dryRun
      ? PATCH_TITLES.DRY_RUN
      : totalFailed === 0
        ? PATCH_TITLES.SUCCESS(totalPatched)
        : totalPatched > 0
          ? PATCH_TITLES.PARTIAL(totalPatched, totalFailed)
          : PATCH_TITLES.FAILED;

    return {
      success,
      title,
      output,
      error: success ? undefined : `${totalFailed} file(s) failed to patch`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      title: PATCH_TITLES.FAILED,
      output: "",
      error: PATCH_ERRORS.PARSE_FAILED(message),
    };
  }
};

/**
 * Apply a patch to a single file
 */
const applyFilePatch = async (
  filePatch: ParsedFilePatch,
  targetPath: string,
  options: { fuzz: number; dryRun: boolean },
): Promise<FilePatchResult> => {
  const hunkResults: HunkApplicationResult[] = [];
  let currentContent: string;
  let originalContent: string;

  try {
    // Handle new files
    if (filePatch.isNew) {
      currentContent = "";
      originalContent = "";
    } else {
      // Read original file
      try {
        currentContent = await fs.readFile(targetPath, "utf-8");
        originalContent = currentContent;
      } catch {
        return {
          success: false,
          filePath: targetPath,
          hunksApplied: 0,
          hunksFailed: filePatch.hunks.length,
          hunkResults: [],
          error: PATCH_ERRORS.FILE_NOT_FOUND(targetPath),
        };
      }
    }

    // Handle deleted files
    if (filePatch.isDeleted) {
      if (!options.dryRun) {
        // Store rollback info
        rollbackStore.set(targetPath, {
          filePath: targetPath,
          originalContent,
          patchedContent: "",
          timestamp: Date.now(),
        });

        await fs.unlink(targetPath);
      }

      return {
        success: true,
        filePath: targetPath,
        hunksApplied: 1,
        hunksFailed: 0,
        hunkResults: [
          {
            success: true,
            hunkIndex: 0,
            appliedAt: 0,
          },
        ],
        newContent: "",
      };
    }

    // Apply each hunk
    let hunksApplied = 0;
    let hunksFailed = 0;

    for (let i = 0; i < filePatch.hunks.length; i++) {
      const hunk = filePatch.hunks[i];

      // Check if already applied
      if (isHunkApplied(currentContent, hunk, { fuzz: options.fuzz })) {
        hunkResults.push({
          success: true,
          hunkIndex: i,
          appliedAt: hunk.oldStart - 1,
        });
        hunksApplied++;
        continue;
      }

      // Find position with fuzzy matching
      const position = findHunkPosition(currentContent, hunk, { fuzz: options.fuzz });

      if (!position.found) {
        hunkResults.push({
          success: false,
          hunkIndex: i,
          error: PATCH_ERRORS.FUZZY_MATCH_FAILED(i),
        });
        hunksFailed++;
        continue;
      }

      // Apply the hunk
      const preview = previewHunkApplication(currentContent, hunk, position.lineNumber);

      if (!preview.success) {
        hunkResults.push({
          success: false,
          hunkIndex: i,
          error: preview.error ?? PATCH_ERRORS.HUNK_FAILED(i, "unknown"),
        });
        hunksFailed++;
        continue;
      }

      currentContent = preview.preview.join("\n");
      hunksApplied++;

      hunkResults.push({
        success: true,
        hunkIndex: i,
        appliedAt: position.lineNumber,
        fuzzyOffset: position.offset !== 0 ? position.offset : undefined,
      });
    }

    // Write the file if not dry run
    if (!options.dryRun && hunksApplied > 0) {
      // Store rollback info
      rollbackStore.set(targetPath, {
        filePath: targetPath,
        originalContent,
        patchedContent: currentContent,
        timestamp: Date.now(),
      });

      // Ensure directory exists
      await fs.mkdir(dirname(targetPath), { recursive: true });

      // Write patched content
      await fs.writeFile(targetPath, currentContent, "utf-8");
    }

    return {
      success: hunksFailed === 0,
      filePath: targetPath,
      hunksApplied,
      hunksFailed,
      hunkResults,
      newContent: currentContent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      filePath: targetPath,
      hunksApplied: 0,
      hunksFailed: filePatch.hunks.length,
      hunkResults,
      error: PATCH_ERRORS.WRITE_FAILED(targetPath, message),
    };
  }
};

/**
 * Format patch results for output
 */
const formatPatchResults = (
  results: FilePatchResult[],
  dryRun: boolean,
): string => {
  const lines: string[] = [];

  for (const result of results) {
    lines.push(`${result.success ? "✓" : "✗"} ${result.filePath}`);

    if (result.hunksApplied > 0 || result.hunksFailed > 0) {
      lines.push(
        `  ${result.hunksApplied} hunk(s) applied, ${result.hunksFailed} failed`,
      );
    }

    // Show fuzzy offsets
    for (const hunk of result.hunkResults) {
      if (hunk.fuzzyOffset) {
        lines.push(
          `  ${PATCH_MESSAGES.FUZZY_APPLIED(hunk.hunkIndex, hunk.fuzzyOffset)}`,
        );
      }
    }

    if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }
  }

  if (dryRun) {
    lines.push("");
    lines.push("(dry run - no changes were made)");
  } else if (results.some((r) => r.success)) {
    lines.push("");
    lines.push(PATCH_MESSAGES.ROLLBACK_AVAILABLE);
  }

  return lines.join("\n");
};

/**
 * Rollback a patched file
 */
export const rollbackPatch = async (filePath: string): Promise<boolean> => {
  const rollback = rollbackStore.get(filePath);
  if (!rollback) {
    return false;
  }

  try {
    if (rollback.originalContent === "") {
      // Was a new file, delete it
      await fs.unlink(filePath);
    } else {
      await fs.writeFile(filePath, rollback.originalContent, "utf-8");
    }

    rollbackStore.delete(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get available rollbacks
 */
export const getAvailableRollbacks = (): string[] => {
  return Array.from(rollbackStore.keys());
};

/**
 * Clear rollback history
 */
export const clearRollbacks = (): void => {
  rollbackStore.clear();
};
