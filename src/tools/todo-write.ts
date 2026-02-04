/**
 * TodoWrite Tool - Allows agent to create and update task lists
 *
 * The agent calls this tool to track progress through multi-step tasks.
 */

import { z } from "zod";
import { todoStore } from "@stores/core/todo-store";
import type { ToolDefinition } from "@tools/core/types";
import type { TodoStatus } from "@/types/todo";

const TodoItemSchema = z.object({
  id: z.string().describe("Unique identifier for the todo item"),
  title: z.string().describe("Brief description of the task"),
  status: z
    .enum(["pending", "in_progress", "completed", "failed"])
    .describe("Current status of the task"),
});

const parametersSchema = z.object({
  todos: z
    .array(TodoItemSchema)
    .describe(
      "Complete list of todo items. Include all items, not just changes.",
    ),
});

type TodoWriteParams = z.infer<typeof parametersSchema>;

export const todoWriteTool: ToolDefinition = {
  name: "todowrite",
  description: `Update the todo list to track progress through multi-step tasks.

Use this tool to:
- Create a task list when starting complex work
- Update task status as you complete each step
- Add new tasks discovered during work
- Mark tasks as completed or failed

Always include the COMPLETE todo list, not just changes. The list will replace the current todos.

Example:
{
  "todos": [
    { "id": "1", "title": "Read the source file", "status": "completed" },
    { "id": "2", "title": "Identify the bug", "status": "in_progress" },
    { "id": "3", "title": "Apply the fix", "status": "pending" },
    { "id": "4", "title": "Verify the build", "status": "pending" }
  ]
}`,
  parameters: parametersSchema,
  execute: async (args: TodoWriteParams) => {
    const { todos } = args;

    // Check if we have an existing plan or need to create one
    const existingPlan = todoStore.getPlan();

    if (!existingPlan) {
      // Create new plan from todos
      const tasks = todos.map((t) => ({
        title: t.title,
        description: undefined,
      }));

      if (tasks.length > 0) {
        todoStore.createPlan("Task Plan", tasks);

        // Update statuses after creation
        const plan = todoStore.getPlan();
        if (plan) {
          todos.forEach((todo, index) => {
            if (plan.items[index]) {
              todoStore.updateItemStatus(
                plan.items[index].id,
                todo.status as TodoStatus,
              );
            }
          });
        }
      }
    } else {
      // Update existing plan - sync with provided todos
      const currentItems = existingPlan.items;

      // Update existing items
      todos.forEach((todo) => {
        const existing = currentItems.find(
          (item) => item.id === todo.id || item.title === todo.title,
        );
        if (existing) {
          todoStore.updateItemStatus(existing.id, todo.status as TodoStatus);
        } else {
          // Add new item
          const newId = todoStore.addItem(todo.title);
          if (newId) {
            todoStore.updateItemStatus(newId, todo.status as TodoStatus);
          }
        }
      });
    }

    // Get final state
    const plan = todoStore.getPlan();
    const progress = todoStore.getProgress();

    if (!plan) {
      return {
        success: true,
        title: "Todos cleared",
        output: "Todo list is now empty.",
      };
    }

    const summary = plan.items
      .map((item) => {
        const icon =
          item.status === "completed"
            ? "✓"
            : item.status === "in_progress"
              ? "→"
              : item.status === "failed"
                ? "✗"
                : "○";
        return `${icon} ${item.title}`;
      })
      .join("\n");

    return {
      success: true,
      title: "Todos updated",
      output: `Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)\n\n${summary}`,
    };
  },
};
