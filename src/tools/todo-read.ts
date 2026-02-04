/**
 * TodoRead Tool - Allows agent to read current task list
 *
 * The agent calls this tool to see current progress and pending tasks.
 */

import { z } from "zod";
import { todoStore } from "@stores/core/todo-store";
import type { ToolDefinition } from "@tools/core/types";

const parametersSchema = z.object({});

export const todoReadTool: ToolDefinition = {
  name: "todoread",
  description: `Read the current todo list to see task progress.

Use this tool to:
- Check what tasks are pending
- See which task is currently in progress
- Review completed tasks
- Plan next steps based on remaining work

Returns the complete todo list with status for each item.`,
  parameters: parametersSchema,
  execute: async () => {
    const plan = todoStore.getPlan();

    if (!plan || plan.items.length === 0) {
      return {
        success: true,
        title: "No todos",
        output: "No tasks in the todo list. Use todowrite to create tasks.",
      };
    }

    const progress = todoStore.getProgress();

    const items = plan.items.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
    }));

    const summary = items
      .map((item) => {
        const icon =
          item.status === "completed"
            ? "✓"
            : item.status === "in_progress"
              ? "→"
              : item.status === "failed"
                ? "✗"
                : "○";
        return `${icon} [${item.id}] ${item.title} (${item.status})`;
      })
      .join("\n");

    return {
      success: true,
      title: `Todos: ${progress.completed}/${progress.total}`,
      output: `Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)\n\n${summary}\n\nTodos JSON:\n${JSON.stringify(items, null, 2)}`,
    };
  },
};
