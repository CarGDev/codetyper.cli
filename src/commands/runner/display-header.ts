/**
 * Runner header display utilities
 */

import chalk from "chalk";
import { headerMessage, filePath } from "@utils/core/terminal";
import type { RunnerOptions } from "@/types/runner";

export const displayHeader = (options: RunnerOptions): void => {
  const { task, agent, files, dryRun } = options;

  headerMessage("Running Task");
  console.log(chalk.bold("Agent:") + ` ${chalk.cyan(agent)}`);
  console.log(chalk.bold("Task:") + ` ${task}`);

  if (files.length > 0) {
    console.log(
      chalk.bold("Files:") + ` ${files.map((f) => filePath(f)).join(", ")}`,
    );
  }

  console.log(
    chalk.bold("Mode:") +
      ` ${dryRun ? chalk.yellow("Dry Run") : chalk.green("Execute")}`,
  );
  console.log();
};
