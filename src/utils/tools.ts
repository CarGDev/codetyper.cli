/**
 * Determine if a tool operation should be quiet (not shown in logs)
 * Quiet operations are read-only exploration tasks
 */

import { QUIET_BASH_PATTERNS } from "@constants/bashPatterns";
import { TOOL_NAMES } from "@constants/tools";

export const isQuietTool = (
  toolName: string,
  args?: Record<string, unknown>,
): boolean => {
  // Read operations are always quiet
  if (TOOL_NAMES.includes(toolName)) {
    return true;
  }

  // Bash commands - check if it's a read-only exploration command
  if (toolName === "bash" && args?.command) {
    const command = String(args.command).trim();
    const bashPatternFound = QUIET_BASH_PATTERNS.some((pattern) =>
      pattern.test(command),
    );
    return bashPatternFound;
  }

  return false;
};
