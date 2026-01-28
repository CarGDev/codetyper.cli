/**
 * Runner types for task execution
 */

import type { AgentType, ExecutionPlan, PlanStep } from "@/types/index";

export interface RunnerOptions {
  task: string;
  agent: AgentType;
  files: string[];
  dryRun: boolean;
  autoApprove: boolean;
}

export interface StepContext {
  step: PlanStep;
  current: number;
  total: number;
}

export type StepIconMap = Record<PlanStep["type"], string>;

export type PlanCreator = (
  task: string,
  agent: AgentType,
  files: string[],
) => Promise<ExecutionPlan>;

export type PlanExecutor = (plan: ExecutionPlan) => Promise<void>;

export type StepExecutor = (context: StepContext) => Promise<void>;
