/**
 * useTodoStore React Hook
 *
 * React hook for accessing todo store state
 */

import { useStore } from "zustand";
import {
  todoStoreVanilla,
  todoStore,
  type TodoState,
} from "@stores/todo-store";

/**
 * Todo store with actions for React components
 */
interface TodoStoreWithActions extends TodoState {
  getProgress: () => { completed: number; total: number; percentage: number };
}

/**
 * React hook for todo store
 */
export const useTodoStore = <T>(
  selector: (state: TodoStoreWithActions) => T,
): T => {
  const state = useStore(todoStoreVanilla, (s) => s);
  const stateWithActions: TodoStoreWithActions = {
    ...state,
    getProgress: todoStore.getProgress,
  };
  return selector(stateWithActions);
};

export default useTodoStore;
