/**
 * Plan execution utilities
 */

import {
  failSpinner,
  succeedSpinner,
  startSpinner,
} from "@utils/core/terminal";
import { RUNNER_DELAYS } from "@constants/runner";
import { getStepIcon } from "@commands/runner/display-plan";
import { delay } from "@commands/runner/utils";
import type { ExecutionPlan, PlanStep } from "@/types/common";
import type { StepContext } from "@/types/runner";

const executeStep = async (context: StepContext): Promise<void> => {
  const { step, current, total } = context;
  const icon = getStepIcon(step.type);
  const message = `${icon} Step ${current}/${total}: ${step.description}`;

  startSpinner(message);

  try {
    await delay(RUNNER_DELAYS.STEP_EXECUTION);
    succeedSpinner(message);
  } catch (error) {
    failSpinner(message);
    throw error;
  }
};

export const executePlan = async (plan: ExecutionPlan): Promise<void> => {
  const total = plan.steps.length;

  for (let i = 0; i < plan.steps.length; i++) {
    const step: PlanStep = plan.steps[i];
    await executeStep({ step, current: i + 1, total });
  }
};
