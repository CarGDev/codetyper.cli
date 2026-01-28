/**
 * Dashboard Left Content Renderer
 */

import chalk from "chalk";
import { DASHBOARD_LOGO } from "@constants/dashboard";
import type { DashboardConfig } from "@/types/dashboard";

export const renderLeftContent = (config: DashboardConfig): string[] => {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.green(`Welcome back ${config.user}!`));
  lines.push("");

  const coloredLogo = DASHBOARD_LOGO.map((line) => chalk.cyan.bold(line));
  lines.push(...coloredLogo);

  lines.push("");
  lines.push(chalk.cyan.bold(`${config.provider.toUpperCase()}`));
  lines.push(chalk.dim(`${config.user}@codetyper`));

  return lines;
};
