/**
 * Plan creation utilities
 */

import {
  RUNNER_DELAYS,
  MOCK_STEPS,
  DEFAULT_FILE,
  ESTIMATED_TIME_PER_STEP,
} from "@constants/runner";
import { delay } from "@commands/runner/utils";
import type { AgentType, ExecutionPlan, PlanStep } from "@/types/common";

export const createPlan = async (
  task: string,
  _agent: AgentType,
  files: string[],
): Promise<ExecutionPlan> => {
  await delay(RUNNER_DELAYS.PLANNING);

  const targetFile = files[0] ?? DEFAULT_FILE;

  const steps: PlanStep[] = [
    {
      ...MOCK_STEPS.READ,
      file: targetFile,
    },
    {
      ...MOCK_STEPS.EDIT,
      file: targetFile,
      dependencies: [...MOCK_STEPS.EDIT.dependencies],
    },
    {
      ...MOCK_STEPS.EXECUTE,
      dependencies: [...MOCK_STEPS.EXECUTE.dependencies],
    },
  ];

  return {
    steps,
    intent: "code",
    summary: task,
    estimatedTime: steps.length * ESTIMATED_TIME_PER_STEP,
  };
};
