/**
 * Todo Store - Manages agent-generated task plans
 */

import { createStore } from "zustand/vanilla";
import { v4 as uuidv4 } from "uuid";
import type { TodoItem, TodoPlan, TodoStatus } from "@/types/todo";

interface TodoState {
  currentPlan: TodoPlan | null;
  history: TodoPlan[];
}

const store = createStore<TodoState>(() => ({
  currentPlan: null,
  history: [],
}));

const createPlan = (
  title: string,
  items: Array<{ title: string; description?: string }>,
): string => {
  const planId = uuidv4();
  const now = Date.now();

  const todoItems: TodoItem[] = items.map((item, index) => ({
    id: uuidv4(),
    title: item.title,
    description: item.description,
    status: index === 0 ? "in_progress" : "pending",
    createdAt: now,
    updatedAt: now,
  }));

  const plan: TodoPlan = {
    id: planId,
    title,
    items: todoItems,
    createdAt: now,
    updatedAt: now,
    completed: false,
  };

  store.setState({ currentPlan: plan });
  return planId;
};

const clearPlan = (): void => {
  const { currentPlan, history } = store.getState();
  if (currentPlan) {
    store.setState({
      currentPlan: null,
      history: [...history, { ...currentPlan, completed: false }],
    });
  }
};

const completePlan = (): void => {
  const { currentPlan, history } = store.getState();
  if (currentPlan) {
    const completedPlan = {
      ...currentPlan,
      completed: true,
      updatedAt: Date.now(),
    };
    store.setState({
      currentPlan: null,
      history: [...history, completedPlan],
    });
  }
};

const addItem = (title: string, description?: string): string | null => {
  const { currentPlan } = store.getState();
  if (!currentPlan) return null;

  const itemId = uuidv4();
  const now = Date.now();

  const newItem: TodoItem = {
    id: itemId,
    title,
    description,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  store.setState({
    currentPlan: {
      ...currentPlan,
      items: [...currentPlan.items, newItem],
      updatedAt: now,
    },
  });

  return itemId;
};

const updateItemStatus = (itemId: string, status: TodoStatus): void => {
  const { currentPlan } = store.getState();
  if (!currentPlan) return;

  const now = Date.now();
  const updatedItems = currentPlan.items.map((item) => {
    if (item.id === itemId) {
      return { ...item, status, updatedAt: now };
    }
    return item;
  });

  // If completing an item, start the next pending one
  if (status === "completed") {
    const nextPending = updatedItems.find((item) => item.status === "pending");
    if (nextPending) {
      const idx = updatedItems.findIndex((item) => item.id === nextPending.id);
      if (idx !== -1) {
        updatedItems[idx] = {
          ...updatedItems[idx],
          status: "in_progress",
          updatedAt: now,
        };
      }
    }
  }

  store.setState({
    currentPlan: {
      ...currentPlan,
      items: updatedItems,
      updatedAt: now,
    },
  });

  // Check if all items are completed
  const allCompleted = updatedItems.every(
    (item) => item.status === "completed" || item.status === "failed",
  );
  if (allCompleted) {
    completePlan();
  }
};

const updateItemTitle = (itemId: string, title: string): void => {
  const { currentPlan } = store.getState();
  if (!currentPlan) return;

  const now = Date.now();
  store.setState({
    currentPlan: {
      ...currentPlan,
      items: currentPlan.items.map((item) =>
        item.id === itemId ? { ...item, title, updatedAt: now } : item,
      ),
      updatedAt: now,
    },
  });
};

const removeItem = (itemId: string): void => {
  const { currentPlan } = store.getState();
  if (!currentPlan) return;

  store.setState({
    currentPlan: {
      ...currentPlan,
      items: currentPlan.items.filter((item) => item.id !== itemId),
      updatedAt: Date.now(),
    },
  });
};

const hasPlan = (): boolean => {
  return store.getState().currentPlan !== null;
};

const getCurrentItem = (): TodoItem | null => {
  const { currentPlan } = store.getState();
  if (!currentPlan) return null;
  return (
    currentPlan.items.find((item) => item.status === "in_progress") || null
  );
};

const getProgress = (): {
  completed: number;
  total: number;
  percentage: number;
} => {
  const { currentPlan } = store.getState();
  if (!currentPlan || currentPlan.items.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = currentPlan.items.filter(
    (item) => item.status === "completed",
  ).length;
  const total = currentPlan.items.length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
};

export const todoStore = {
  createPlan,
  clearPlan,
  completePlan,
  addItem,
  updateItemStatus,
  updateItemTitle,
  removeItem,
  hasPlan,
  getCurrentItem,
  getProgress,
  getPlan: () => store.getState().currentPlan,
  getHistory: () => store.getState().history,
  subscribe: store.subscribe,
};
