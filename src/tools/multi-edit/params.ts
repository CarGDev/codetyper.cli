/**
 * MultiEdit Tool Parameters
 */

import { z } from "zod";

export const editItemSchema = z.object({
  file_path: z.string().describe("Absolute path to the file to edit"),
  old_string: z.string().describe("The exact text to find and replace"),
  new_string: z.string().describe("The replacement text"),
});

export const multiEditParams = z.object({
  edits: z
    .array(editItemSchema)
    .min(1)
    .describe("Array of edits to apply atomically"),
});

export type EditItem = z.infer<typeof editItemSchema>;
export type MultiEditParams = z.infer<typeof multiEditParams>;
