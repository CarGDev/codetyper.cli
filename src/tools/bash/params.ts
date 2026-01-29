/**
 * Bash tool parameter schema
 */

import { z } from "zod";

export const bashParams = z.object({
  command: z.string().describe("The bash command to execute"),
  description: z
    .string()
    .optional()
    .describe("A brief description of what this command does"),
  workdir: z
    .string()
    .optional()
    .describe(
      "Working directory for the command (defaults to current directory)",
    ),
  timeout: z
    .number()
    .optional()
    .describe("Timeout in milliseconds (default: 120000)"),
});

export type BashParamsSchema = typeof bashParams;
