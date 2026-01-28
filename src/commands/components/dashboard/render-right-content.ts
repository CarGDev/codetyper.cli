/**
 * Dashboard Right Content Renderer
 */

import chalk from "chalk";
import { DASHBOARD_COMMANDS } from "@constants/dashboard";

export const renderRightContent = (): string[] => {
  const lines: string[] = [];

  lines.push(chalk.bold("Ready to code"));
  lines.push("");

  for (const { command, description } of DASHBOARD_COMMANDS) {
    lines.push(chalk.cyan(command));
    lines.push(`  ${description}`);
    lines.push("");
  }

  return lines;
};
