/**
 * Edit tool parameter schema
 */

import { z } from "zod";

export const editParams = z.object({
  filePath: z.string().describe("The absolute path to the file to edit"),
  oldString: z.string().describe("The exact text to find and replace"),
  newString: z.string().describe("The text to replace it with"),
  replaceAll: z
    .boolean()
    .optional()
    .describe("Replace all occurrences (default: false)"),
});

export type EditParamsSchema = typeof editParams;
