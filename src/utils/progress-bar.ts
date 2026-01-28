/**
 * Progress bar rendering utilities
 */

import chalk from "chalk";

const DEFAULT_BAR_WIDTH = 40;

interface ProgressBarOptions {
  width?: number;
  filledChar?: string;
  emptyChar?: string;
  showPercentage?: boolean;
}

const defaultOptions: Required<ProgressBarOptions> = {
  width: DEFAULT_BAR_WIDTH,
  filledChar: "█",
  emptyChar: "░",
  showPercentage: true,
};

export const renderProgressBar = (
  percent: number,
  options: ProgressBarOptions = {},
): string => {
  const opts = { ...defaultOptions, ...options };
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filledWidth = Math.round((clampedPercent / 100) * opts.width);
  const emptyWidth = opts.width - filledWidth;

  const filledPart = opts.filledChar.repeat(filledWidth);
  const emptyPart = opts.emptyChar.repeat(emptyWidth);

  const color =
    clampedPercent > 80
      ? chalk.red
      : clampedPercent > 50
        ? chalk.yellow
        : chalk.blueBright;

  const bar = color(filledPart) + chalk.gray(emptyPart);

  if (opts.showPercentage) {
    return `${bar} ${clampedPercent.toFixed(0)}% used`;
  }

  return bar;
};

export const renderUsageBar = (
  title: string,
  used: number,
  total: number,
  resetInfo?: string,
): string[] => {
  const lines: string[] = [];
  const percent = total > 0 ? (used / total) * 100 : 0;

  lines.push(chalk.bold(title));
  lines.push(renderProgressBar(percent));

  if (resetInfo) {
    lines.push(chalk.gray(resetInfo));
  }

  return lines;
};

export const renderUnlimitedBar = (title: string): string[] => {
  const lines: string[] = [];
  lines.push(chalk.bold(title));
  lines.push(
    chalk.green("█".repeat(DEFAULT_BAR_WIDTH)) + " " + chalk.green("Unlimited"),
  );
  return lines;
};
