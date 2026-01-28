/**
 * Dashboard Footer Renderer
 */

import chalk from "chalk";
import {
  DASHBOARD_BORDER,
  DASHBOARD_QUICK_COMMANDS,
} from "@constants/dashboard";

export const renderFooter = (width: number): string => {
  const dashCount = Math.max(0, width - 2);
  const dashes = DASHBOARD_BORDER.HORIZONTAL.repeat(dashCount);
  const borderLine = `${DASHBOARD_BORDER.BOTTOM_LEFT}${dashes}${DASHBOARD_BORDER.BOTTOM_RIGHT}`;

  const commandLines = DASHBOARD_QUICK_COMMANDS.map(
    ({ command, description }) =>
      `  ${chalk.cyan(command.padEnd(18))} ${description}`,
  );

  const lines = [
    borderLine,
    "",
    chalk.dim("Quick Commands:"),
    ...commandLines,
    "",
    chalk.dim("Press Ctrl+C to exit • Type 'codetyper chat' to begin"),
  ];

  return lines.join("\n");
};
