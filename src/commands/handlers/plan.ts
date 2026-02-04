/**
 * Plan command handler
 */

import chalk from "chalk";
import {
  hightLigthedJson,
  filePath,
  errorMessage,
  failSpinner,
  headerMessage,
  startSpinner,
  succeedSpinner,
  successMessage,
} from "@utils/core/terminal";
import type { CommandOptions } from "@/types/index";

export const handlePlan = async (options: CommandOptions): Promise<void> => {
  const { intent, task, files = [], output } = options;

  if (!task) {
    errorMessage("Task description is required");
    return;
  }

  headerMessage("Generating Plan");
  console.log(chalk.bold("Intent:") + ` ${chalk.cyan(intent || "unknown")}`);
  console.log(chalk.bold("Task:") + ` ${task}`);
  if (files.length > 0) {
    console.log(chalk.bold("Files:") + ` ${files.join(", ")}`);
  }
  console.log();

  startSpinner("Generating execution plan...");

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    succeedSpinner("Plan generated");

    const plan = {
      intent,
      task,
      files,
      steps: [
        { id: "step_1", type: "read", description: "Analyze existing code" },
        { id: "step_2", type: "edit", description: "Apply changes" },
        { id: "step_3", type: "execute", description: "Run tests" },
      ],
    };

    if (output) {
      const fs = await import("fs/promises");
      await fs.writeFile(output, JSON.stringify(plan, null, 2));
      successMessage(`Plan saved to ${filePath(output)}`);
    } else {
      hightLigthedJson(plan);
    }
  } catch (error) {
    failSpinner("Plan generation failed");
    throw error;
  }
};
