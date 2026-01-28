/**
 * Read tool parameter schema
 */

import { z } from "zod";

import { READ_DEFAULTS } from "@constants/read";

export const readParams = z.object({
  filePath: z.string().describe("The absolute path to the file to read"),
  offset: z
    .number()
    .optional()
    .describe("Line number to start reading from (0-indexed)"),
  limit: z
    .number()
    .optional()
    .describe(
      `Maximum number of lines to read (default: ${READ_DEFAULTS.MAX_LINES})`,
    ),
});

export type ReadParamsSchema = typeof readParams;
