/**
 * Plan display utilities
 */

import chalk from "chalk";
import { filePath } from "@utils/core/terminal";
import { STEP_ICONS, DEFAULT_STEP_ICON } from "@constants/runner";
import type { ExecutionPlan, PlanStep } from "@/types/index";

export const getStepIcon = (type: PlanStep["type"]): string =>
  STEP_ICONS[type] ?? DEFAULT_STEP_ICON;

export const displayPlan = (plan: ExecutionPlan): void => {
  console.log("\n" + chalk.bold.underline("Execution Plan:"));
  console.log(chalk.gray(`${plan.summary}`));
  console.log();

  plan.steps.forEach((step, index) => {
    const icon = getStepIcon(step.type);
    const deps = step.dependencies
      ? chalk.gray(` (depends on: ${step.dependencies.join(", ")})`)
      : "";
    console.log(
      `${icon} ${chalk.bold(`Step ${index + 1}:`)} ${step.description}${deps}`,
    );
    if (step.file) {
      console.log(`   ${filePath(step.file)}`);
    }
    if (step.tool) {
      console.log(`   ${chalk.gray(`Tool: ${step.tool}`)}`);
    }
  });
  console.log();
};
