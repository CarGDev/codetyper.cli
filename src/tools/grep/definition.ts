/**
 * Grep Tool Definition - Search file contents
 */

import { z } from "zod";
import { executeRipgrep } from "@tools/grep/execute";
import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";

export const grepParams = z.object({
  pattern: z
    .string()
    .describe("The regular expression pattern to search for in file contents"),
  path: z
    .string()
    .optional()
    .describe(
      "File or directory to search in. Defaults to current working directory.",
    ),
  glob: z
    .string()
    .optional()
    .describe("Glob pattern to filter files (e.g., '*.ts', '**/*.tsx')"),
  case_insensitive: z.boolean().optional().describe("Case insensitive search"),
  context_lines: z
    .number()
    .optional()
    .describe("Number of context lines to show before and after each match"),
});

type GrepParams = z.infer<typeof grepParams>;

const executeGrepTool = async (
  args: GrepParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  // Execute ripgrep search
  const directory = args.path || ctx.workingDir;
  const result = await executeRipgrep(args.pattern, directory);

  return {
    success: result.success,
    title: result.title,
    output: result.output,
    error: result.error,
  };
};

export const grepToolDefinition: ToolDefinition<typeof grepParams> = {
  name: "grep",
  description: `A powerful search tool built on ripgrep for searching file contents.
- Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
- Filter files with glob parameter (e.g., "*.js", "**/*.tsx")
- Use this when you need to find code patterns, function definitions, or specific text
- For finding files by name, use glob instead`,
  parameters: grepParams,
  execute: executeGrepTool,
};
