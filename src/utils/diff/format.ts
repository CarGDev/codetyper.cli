/**
 * Diff formatting utilities
 */

import chalk from "chalk";
import { LINE_PREFIXES } from "@constants/diff";
import type { DiffResult, DiffLine, DiffLineType } from "@/types/diff";
import { computeLCS } from "@utils/diff/lcs";
import { generateDiffLines } from "@utils/diff/lines";

// Line formatters by type
const LINE_FORMATTERS: Record<DiffLineType, (content: string) => string> = {
  add: (content) => chalk.green(`${LINE_PREFIXES.add}${content}`),
  remove: (content) => chalk.red(`${LINE_PREFIXES.remove}${content}`),
  context: (content) => chalk.gray(`${LINE_PREFIXES.context}${content}`),
};

/**
 * Format a single diff line
 */
const formatLine = (line: DiffLine): string =>
  LINE_FORMATTERS[line.type](line.content);

/**
 * Format diff as colored string for terminal output
 */
export const formatDiff = (diff: DiffResult, filePath?: string): string => {
  if (diff.hunks.length === 0) {
    return chalk.gray("No changes");
  }

  const lines: string[] = [];

  // Header
  if (filePath) {
    lines.push(chalk.bold(`--- a/${filePath}`));
    lines.push(chalk.bold(`+++ b/${filePath}`));
  }

  // Hunks
  for (const hunk of diff.hunks) {
    lines.push(
      chalk.cyan(
        `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`,
      ),
    );

    for (const line of hunk.lines) {
      lines.push(formatLine(line));
    }
  }

  // Summary
  lines.push("");
  lines.push(
    chalk.green(`+${diff.additions}`) + " / " + chalk.red(`-${diff.deletions}`),
  );

  return lines.join("\n");
};

/**
 * Generate a compact diff showing only changed lines (no context)
 */
export const formatCompactDiff = (
  oldContent: string,
  newContent: string,
): string => {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const dp = computeLCS(oldLines, newLines);
  const diffLines = generateDiffLines(oldLines, newLines, dp);

  const lines: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of diffLines) {
    if (line.type === "add") {
      lines.push(chalk.green(`+ ${line.content}`));
      additions++;
    } else if (line.type === "remove") {
      lines.push(chalk.red(`- ${line.content}`));
      deletions++;
    }
  }

  if (lines.length === 0) {
    return chalk.gray("No changes");
  }

  lines.push("");
  lines.push(chalk.green(`+${additions}`) + " / " + chalk.red(`-${deletions}`));

  return lines.join("\n");
};
