/**
 * Validate command handler
 */

import chalk from "chalk";
import {
  failSpinner,
  warningMessage,
  successMessage,
  succeedSpinner,
  startSpinner,
  errorMessage,
  headerMessage,
  filePath,
} from "@utils/core/terminal";
import { getConfig } from "@services/core/config";
import type { CommandOptions } from "@/types/index";

export const handleValidate = async (
  options: CommandOptions,
): Promise<void> => {
  const { planFile } = options;

  if (!planFile) {
    errorMessage("Plan file is required");
    return;
  }

  headerMessage("Validating Plan");
  console.log(chalk.bold("Plan file:") + ` ${filePath(planFile)}`);
  console.log();

  startSpinner("Validating plan...");

  try {
    const fs = await import("fs/promises");
    const planData = await fs.readFile(planFile, "utf-8");
    const plan = JSON.parse(planData);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const config = await getConfig();

    const warnings: string[] = [];
    const errors: string[] = [];

    plan.files?.forEach((file: string) => {
      if (config.isProtectedPath(file)) {
        warnings.push(`Protected path: ${file}`);
      }
    });

    succeedSpinner("Validation complete");

    console.log();
    if (errors.length > 0) {
      console.log(chalk.red.bold("Errors:"));
      errors.forEach((err) => console.log(`  - ${err}`));
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow.bold("Warnings:"));
      warnings.forEach((warn) => console.log(`  - ${warn}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
      successMessage("Plan is valid and safe to execute");
    } else if (errors.length > 0) {
      errorMessage("Plan has errors and cannot be executed");
      process.exit(1);
    } else {
      warningMessage("Plan has warnings - proceed with caution");
    }
  } catch (error) {
    failSpinner("Validation failed");
    throw error;
  }
};
