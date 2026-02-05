/**
 * Glob Tool Definition - File pattern matching
 */

import { z } from "zod";
import { executeGlob } from "@tools/glob/execute";
import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";

export const globParams = z.object({
  pattern: z
    .string()
    .describe(
      "The glob pattern to match files against (e.g., '**/*.ts', 'src/**/*.tsx')",
    ),
  path: z
    .string()
    .optional()
    .describe(
      "The directory to search in. Defaults to current working directory.",
    ),
});

type GlobParams = z.infer<typeof globParams>;

const executeGlobTool = async (
  args: GlobParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const result = await executeGlob(args.pattern, {
    cwd: args.path || ctx.workingDir,
  });

  return {
    success: result.success,
    title: result.title,
    output: result.output,
    error: result.error,
  };
};

export const globToolDefinition: ToolDefinition<typeof globParams> = {
  name: "glob",
  description: `Fast file pattern matching tool that works with any codebase size.
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this when you need to find files by name patterns
- For searching file contents, use grep instead`,
  parameters: globParams,
  execute: executeGlobTool,
};
