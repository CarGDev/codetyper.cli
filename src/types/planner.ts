/**
 * Planner Types
 */

export type PlanStepType =
  | "read"
  | "write"
  | "edit"
  | "execute"
  | "analyze"
  | "verify";
export type PlanStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";
export type PlanStatus =
  | "draft"
  | "approved"
  | "in_progress"
  | "completed"
  | "failed";

export interface PlanStep {
  id: number;
  description: string;
  type: PlanStepType;
  target?: string;
  dependencies?: number[];
  status: PlanStepStatus;
  result?: string;
  error?: string;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  createdAt: number;
  updatedAt: number;
  status: PlanStatus;
}
