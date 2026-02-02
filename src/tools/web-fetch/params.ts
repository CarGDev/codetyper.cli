/**
 * WebFetch Tool Parameters
 */

import { z } from "zod";

export const webFetchParams = z.object({
  url: z.string().describe("The URL to fetch content from"),
  prompt: z
    .string()
    .optional()
    .describe("Optional prompt to extract specific information from the content"),
  timeout: z
    .number()
    .optional()
    .describe("Timeout in milliseconds (default: 30000)"),
});

export type WebFetchParams = z.infer<typeof webFetchParams>;
