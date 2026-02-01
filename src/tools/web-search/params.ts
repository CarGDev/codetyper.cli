/**
 * Web Search Tool Parameters
 */

import { z } from "zod";

export const webSearchParams = z.object({
  query: z.string().describe("The search query"),
  maxResults: z
    .number()
    .optional()
    .default(5)
    .describe("Maximum number of results to return (default: 5)"),
});

export type WebSearchParamsSchema = typeof webSearchParams;
export type WebSearchParams = z.infer<typeof webSearchParams>;
