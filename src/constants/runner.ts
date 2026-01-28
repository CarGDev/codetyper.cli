/**
 * Runner constants for task execution
 */

import type { StepIconMap } from "@/types/runner";

export const RUNNER_DELAYS = {
  DISCOVERY: 1500,
  PLANNING: 1000,
  STEP_EXECUTION: 1000,
} as const;

export const STEP_ICONS: StepIconMap = {
  read: "📖",
  edit: "✏️",
  create: "📝",
  delete: "🗑️",
  execute: "⚙️",
} as const;

export const DEFAULT_STEP_ICON = "📌";

export const DEFAULT_FILE = "src/index.ts";

export const RUNNER_MESSAGES = {
  DISCOVERY_START: "Discovery phase: Analyzing codebase...",
  DISCOVERY_COMPLETE: "Discovery complete",
  PLANNING_START: "Planning phase: Creating execution plan...",
  DRY_RUN_INFO: "Dry run mode - plan generated but not executed",
  EXECUTION_CANCELLED: "Execution cancelled by user",
  TASK_COMPLETE: "Task completed successfully!",
  TASK_FAILED: "Task failed",
  TASK_REQUIRED: "Task description is required",
  CONFIRM_EXECUTE: "\nExecute this plan?",
} as const;

export const MOCK_STEPS = {
  READ: {
    id: "step_1",
    type: "read" as const,
    description: "Read existing files to understand context",
    tool: "view",
  },
  EDIT: {
    id: "step_2",
    type: "edit" as const,
    description: "Apply necessary changes",
    dependencies: ["step_1"],
    tool: "edit",
  },
  EXECUTE: {
    id: "step_3",
    type: "execute" as const,
    description: "Verify changes work correctly",
    dependencies: ["step_2"],
    tool: "bash",
    args: { command: "npm test" },
  },
} as const;

export const ESTIMATED_TIME_PER_STEP = 5;
