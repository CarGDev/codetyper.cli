/**
 * Todo/Plan Types
 *
 * Types for agent-generated task plans
 */

export type TodoStatus = "pending" | "in_progress" | "completed" | "failed";

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: number;
  updatedAt: number;
}

export interface TodoPlan {
  id: string;
  title: string;
  items: TodoItem[];
  createdAt: number;
  updatedAt: number;
  completed: boolean;
}

export interface TodoState {
  currentPlan: TodoPlan | null;
  history: TodoPlan[];
}
