/**
 * Complete Task Tool
 *
 * The ONLY way for the agent to signal that a task is complete.
 * The agent loop will not stop until this tool is called.
 */

import { z } from "zod";
import type { ToolDefinition, ToolResult } from "@/types/tools";

const COMPLETE_TASK_DESCRIPTION =
  "Signal that the current task is complete. This is the ONLY way to finish a task. " +
  "Call this when all steps are done and verified, OR when you've determined no changes are needed. " +
  "You MUST call this tool to finish — the loop will not stop otherwise.";

export const completeTaskParams = z.object({
  result: z
    .enum(["changes_applied", "no_changes_needed", "blocked"])
    .describe("The outcome of the task"),
  summary: z
    .string()
    .describe("Brief summary of what was done or why no changes were needed"),
});

type CompleteTaskParams = z.infer<typeof completeTaskParams>;

const executeCompleteTask = async (
  args: CompleteTaskParams,
): Promise<ToolResult> => ({
  success: true,
  title: "Task Complete",
  output: `[TASK_COMPLETE] result=${args.result} summary=${args.summary}`,
  metadata: {
    taskComplete: true,
    result: args.result,
    summary: args.summary,
  },
});

export const completeTaskTool: ToolDefinition<typeof completeTaskParams> = {
  name: "complete_task",
  description: COMPLETE_TASK_DESCRIPTION,
  parameters: completeTaskParams,
  execute: executeCompleteTask,
};
