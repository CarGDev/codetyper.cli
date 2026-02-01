/**
 * useThemeStore React Hook
 *
 * React hook for accessing theme store state
 */

import { useStore } from "zustand";
import {
  themeStoreVanilla,
  themeActions,
  type ThemeState,
} from "@stores/theme-store";
import type { ThemeColors } from "@/types/theme";

/**
 * Theme store with actions for React components
 */
interface ThemeStoreWithActions extends ThemeState {
  setTheme: (themeName: string) => void;
}

/**
 * React hook for theme store
 */
export const useThemeStore = <T>(
  selector: (state: ThemeStoreWithActions) => T,
): T => {
  const state = useStore(themeStoreVanilla, (s) => s);
  const stateWithActions: ThemeStoreWithActions = {
    ...state,
    setTheme: themeActions.setTheme,
  };
  return selector(stateWithActions);
};

/**
 * React hook for theme colors only
 */
export const useThemeColors = (): ThemeColors => {
  return useStore(themeStoreVanilla, (state) => state.colors);
};

export default useThemeStore;
