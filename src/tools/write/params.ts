/**
 * Write tool parameter schema
 */

import { z } from "zod";

export const writeParams = z.object({
  filePath: z.string().describe("The absolute path to the file to write"),
  content: z.string().describe("The content to write to the file"),
});

export type WriteParamsSchema = typeof writeParams;
