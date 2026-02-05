/**
 * Apply Patch Tool Parameters
 */

import { z } from "zod";
import { PATCH_DEFAULTS } from "@constants/apply-patch";

/**
 * Zod schema for apply_patch tool parameters
 */
export const applyPatchParams = z.object({
  patch: z.string().describe("The unified diff patch content to apply"),

  targetFile: z
    .string()
    .optional()
    .describe("Override the target file path from the patch header"),

  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe("Validate and preview changes without actually applying them"),

  fuzz: z
    .number()
    .int()
    .min(0)
    .max(PATCH_DEFAULTS.MAX_FUZZ)
    .optional()
    .default(PATCH_DEFAULTS.FUZZ)
    .describe(
      `Context line tolerance for fuzzy matching (0-${PATCH_DEFAULTS.MAX_FUZZ})`,
    ),

  reverse: z
    .boolean()
    .optional()
    .default(false)
    .describe("Apply the patch in reverse (undo the changes)"),
});

export type ApplyPatchParams = z.infer<typeof applyPatchParams>;
