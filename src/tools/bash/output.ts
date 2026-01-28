/**
 * Bash output handling utilities
 */

import { BASH_DEFAULTS, BASH_MESSAGES } from "@constants/bash";
import type { ToolContext } from "@/types/tools";

export const truncateOutput = (output: string): string =>
  output.length > BASH_DEFAULTS.MAX_OUTPUT_LENGTH
    ? output.slice(0, BASH_DEFAULTS.MAX_OUTPUT_LENGTH) + BASH_MESSAGES.TRUNCATED
    : output;

export const createOutputHandler = (
  ctx: ToolContext,
  description: string,
  outputRef: { value: string },
) => {
  return (data: Buffer): void => {
    const chunk = data.toString();
    outputRef.value += chunk;

    ctx.onMetadata?.({
      title: description,
      status: "running",
      output: truncateOutput(outputRef.value),
    });
  };
};

export const updateRunningStatus = (
  ctx: ToolContext,
  description: string,
): void => {
  ctx.onMetadata?.({
    title: description,
    status: "running",
    output: "",
  });
};
