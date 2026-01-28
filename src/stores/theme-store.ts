/**
 * Theme Store
 *
 * Manages the current theme state for the TUI
 */

import { createStore } from "zustand/vanilla";
import type { Theme, ThemeColors } from "@/types/theme";
import { THEMES, DEFAULT_THEME, getTheme } from "@constants/themes";

interface ThemeState {
  currentTheme: string;
  theme: Theme;
  colors: ThemeColors;
}

const store = createStore<ThemeState>(() => ({
  currentTheme: DEFAULT_THEME,
  theme: getTheme(DEFAULT_THEME),
  colors: getTheme(DEFAULT_THEME).colors,
}));

export const themeActions = {
  setTheme: (themeName: string): void => {
    const theme = getTheme(themeName);
    store.setState({
      currentTheme: theme.name,
      theme,
      colors: theme.colors,
    });
  },

  getCurrentTheme: (): string => {
    return store.getState().currentTheme;
  },

  getTheme: (): Theme => {
    return store.getState().theme;
  },

  getColors: (): ThemeColors => {
    return store.getState().colors;
  },

  getAvailableThemes: (): string[] => {
    return Object.keys(THEMES);
  },

  subscribe: store.subscribe,
};
