/**
 * Read tool formatting utilities
 */

import { READ_DEFAULTS } from "@constants/read";

export const truncateLine = (line: string): string =>
  line.length > READ_DEFAULTS.MAX_LINE_LENGTH
    ? line.substring(0, READ_DEFAULTS.MAX_LINE_LENGTH) + "..."
    : line;

export const formatLineWithNumber = (
  line: string,
  lineNumber: number,
): string =>
  String(lineNumber).padStart(READ_DEFAULTS.LINE_NUMBER_PAD, " ") + "\t" + line;

export const calculateLineSize = (line: string): number =>
  Buffer.byteLength(line, "utf-8") + 1;

export const processLines = (
  lines: string[],
  offset: number,
  limit: number,
): { output: string[]; truncated: boolean } => {
  const result: string[] = [];
  let bytes = 0;
  const maxLine = Math.min(lines.length, offset + limit);

  for (let i = offset; i < maxLine; i++) {
    const truncatedLine = truncateLine(lines[i]);
    const lineWithNumber = formatLineWithNumber(truncatedLine, i + 1);
    const size = calculateLineSize(lineWithNumber);

    if (bytes + size > READ_DEFAULTS.MAX_BYTES) break;

    result.push(lineWithNumber);
    bytes += size;
  }

  return {
    output: result,
    truncated: result.length < lines.length - offset,
  };
};
