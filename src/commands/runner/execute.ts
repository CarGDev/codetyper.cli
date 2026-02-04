/**
 * Main runner execution function
 */

import {
  askConfirm,
  failSpinner,
  successMessage,
  succeedSpinner,
  headerMessage,
  startSpinner,
  infoMessage,
  errorMessage,
  warningMessage,
} from "@utils/core/terminal";
import { RUNNER_DELAYS, RUNNER_MESSAGES } from "@constants/runner";
import { displayHeader } from "@commands/runner/display-header";
import { displayPlan } from "@commands/runner/display-plan";
import { createPlan } from "@commands/runner/create-plan";
import { executePlan } from "@commands/runner/execute-plan";
import { delay } from "@commands/runner/utils";
import type { CommandOptions, AgentType } from "@/types/index";
import type { RunnerOptions } from "@/types/runner";

const parseOptions = (options: CommandOptions): RunnerOptions | null => {
  const {
    task,
    agent = "coder",
    files = [],
    dryRun = false,
    autoApprove = false,
  } = options;

  if (!task) {
    errorMessage(RUNNER_MESSAGES.TASK_REQUIRED);
    return null;
  }

  return {
    task,
    agent: agent as AgentType,
    files,
    dryRun,
    autoApprove,
  };
};

const runDiscoveryPhase = async (): Promise<void> => {
  startSpinner(RUNNER_MESSAGES.DISCOVERY_START);
  await delay(RUNNER_DELAYS.DISCOVERY);
  succeedSpinner(RUNNER_MESSAGES.DISCOVERY_COMPLETE);
};

const runPlanningPhase = async (
  task: string,
  agent: AgentType,
  files: string[],
) => {
  startSpinner(RUNNER_MESSAGES.PLANNING_START);
  const plan = await createPlan(task, agent, files);
  succeedSpinner(`Plan created with ${plan.steps.length} steps`);
  return plan;
};

const confirmExecution = async (autoApprove: boolean): Promise<boolean> => {
  if (autoApprove) {
    return true;
  }

  const approved = await askConfirm(RUNNER_MESSAGES.CONFIRM_EXECUTE);

  if (!approved) {
    warningMessage(RUNNER_MESSAGES.EXECUTION_CANCELLED);
    return false;
  }

  return true;
};

export const execute = async (options: CommandOptions): Promise<void> => {
  const runnerOptions = parseOptions(options);

  if (!runnerOptions) {
    return;
  }

  const { task, agent, files, dryRun, autoApprove } = runnerOptions;

  displayHeader(runnerOptions);

  try {
    await runDiscoveryPhase();

    const plan = await runPlanningPhase(task, agent, files);

    displayPlan(plan);

    if (dryRun) {
      infoMessage(RUNNER_MESSAGES.DRY_RUN_INFO);
      return;
    }

    const shouldExecute = await confirmExecution(autoApprove);

    if (!shouldExecute) {
      return;
    }

    headerMessage("Executing Plan");
    await executePlan(plan);

    successMessage(`\n${RUNNER_MESSAGES.TASK_COMPLETE}`);
  } catch (error) {
    failSpinner(RUNNER_MESSAGES.TASK_FAILED);
    errorMessage(`Error: ${error}`);
    throw error;
  }
};
