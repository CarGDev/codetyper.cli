/**
 * Tool Output Truncation
 *
 * Truncates large tool outputs before adding them to the conversation context.
 * Preserves head + tail of the output with a truncation notice in between.
 * Prevents unbounded token growth from large file reads, bash outputs, etc.
 */

import {
  TOOL_OUTPUT_MAX_BYTES,
  TOOL_OUTPUT_MAX_LINES,
  TOOL_OUTPUT_HEAD_LINES,
  TOOL_OUTPUT_TAIL_LINES,
  TOOL_OUTPUT_TRUNCATION_NOTICE,
} from "@constants/tools";

export interface TruncationResult {
  content: string;
  wasTruncated: boolean;
  originalLines: number;
  originalBytes: number;
}

/**
 * Truncate tool output if it exceeds configured limits.
 * Preserves the first TOOL_OUTPUT_HEAD_LINES and last TOOL_OUTPUT_TAIL_LINES
 * with a truncation notice in between.
 */
export const truncateToolOutput = (output: string): TruncationResult => {
  const originalBytes = Buffer.byteLength(output, "utf-8");
  const lines = output.split("\n");
  const originalLines = lines.length;

  const exceedsBytes = originalBytes > TOOL_OUTPUT_MAX_BYTES;
  const exceedsLines = originalLines > TOOL_OUTPUT_MAX_LINES;

  if (!exceedsBytes && !exceedsLines) {
    return {
      content: output,
      wasTruncated: false,
      originalLines,
      originalBytes,
    };
  }

  // Truncate by lines (head + tail)
  if (exceedsLines) {
    const head = lines.slice(0, TOOL_OUTPUT_HEAD_LINES).join("\n");
    const tail = lines.slice(-TOOL_OUTPUT_TAIL_LINES).join("\n");
    const omitted = originalLines - TOOL_OUTPUT_HEAD_LINES - TOOL_OUTPUT_TAIL_LINES;

    return {
      content:
        head +
        TOOL_OUTPUT_TRUNCATION_NOTICE +
        `(${omitted} lines omitted)\n\n` +
        tail,
      wasTruncated: true,
      originalLines,
      originalBytes,
    };
  }

  // Truncate by bytes (take first TOOL_OUTPUT_MAX_BYTES worth)
  const truncatedByBytes = output.slice(0, TOOL_OUTPUT_MAX_BYTES);
  // Find last newline to avoid cutting mid-line
  const lastNewline = truncatedByBytes.lastIndexOf("\n");
  const cleanCut = lastNewline > 0 ? truncatedByBytes.slice(0, lastNewline) : truncatedByBytes;

  return {
    content:
      cleanCut +
      TOOL_OUTPUT_TRUNCATION_NOTICE +
      `(${originalBytes - Buffer.byteLength(cleanCut, "utf-8")} bytes omitted)`,
    wasTruncated: true,
    originalLines,
    originalBytes,
  };
};
