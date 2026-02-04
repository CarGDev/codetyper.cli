/**
 * Apply Patch Tool
 *
 * Applies unified diff patches to files with fuzzy matching support.
 */

import type { ToolDefinition } from "@tools/core/types";
import { applyPatchParams } from "@tools/apply-patch/params";
import { executeApplyPatch } from "@tools/apply-patch/execute";

export { applyPatchParams } from "@tools/apply-patch/params";
export { executeApplyPatch, rollbackPatch, getAvailableRollbacks, clearRollbacks } from "@tools/apply-patch/execute";
export { parsePatch, validatePatch, getTargetPath, reversePatch } from "@tools/apply-patch/parser";
export { findHunkPosition, isHunkApplied, previewHunkApplication } from "@tools/apply-patch/matcher";

/**
 * Tool description
 */
const APPLY_PATCH_DESCRIPTION = `Apply a unified diff patch to one or more files.

Use this tool to:
- Apply changes from a diff/patch
- Update files based on patch content
- Preview changes before applying (dry run)

Parameters:
- patch: The unified diff content (required)
- targetFile: Override the target file path (optional)
- dryRun: Preview without applying changes (default: false)
- fuzz: Context line tolerance 0-3 (default: 2)
- reverse: Apply patch in reverse to undo changes (default: false)

The tool supports:
- Standard unified diff format (git diff, diff -u)
- Fuzzy context matching when lines have shifted
- Creating new files
- Deleting files
- Rollback on failure

Example patch format:
\`\`\`
--- a/src/example.ts
+++ b/src/example.ts
@@ -10,6 +10,7 @@ function example() {
   const a = 1;
   const b = 2;
+  const c = 3;
   return a + b;
 }
\`\`\``;

/**
 * Apply patch tool definition
 */
export const applyPatchTool: ToolDefinition = {
  name: "apply_patch",
  description: APPLY_PATCH_DESCRIPTION,
  parameters: applyPatchParams,
  execute: executeApplyPatch,
};
