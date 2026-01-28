import { type Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import { createSimpleContext } from "./helper";
import { THEMES, DEFAULT_THEME, getTheme } from "@constants/themes";
import type { Theme, ThemeColors } from "@/types/theme";

interface ThemeStore {
  currentTheme: Theme;
  themeName: string;
}

interface ThemeContextValue {
  theme: Accessor<Theme>;
  themeName: Accessor<string>;
  colors: ThemeColors;
  availableThemes: () => string[];
  setTheme: (name: string) => void;
  cycleTheme: () => void;
  getColor: (key: keyof ThemeColors) => string;
}

export const { provider: ThemeProvider, use: useTheme } =
  createSimpleContext<ThemeContextValue>({
    name: "Theme",
    init: () => {
      const savedTheme = loadSavedTheme();
      const initialTheme = getTheme(savedTheme);

      const [store, setStore] = createStore<ThemeStore>({
        currentTheme: initialTheme,
        themeName: savedTheme,
      });

      const theme = (): Theme => store.currentTheme;
      const themeName = (): string => store.themeName;

      const availableThemes = (): string[] => Object.keys(THEMES);

      const setTheme = (name: string): void => {
        const newTheme = getTheme(name);
        setStore({
          currentTheme: newTheme,
          themeName: name,
        });
        saveTheme(name);
      };

      const cycleTheme = (): void => {
        const themes = availableThemes();
        const currentIndex = themes.indexOf(store.themeName);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
      };

      const getColor = (key: keyof ThemeColors): string => {
        const color = store.currentTheme.colors[key];
        return typeof color === "string" ? color : "";
      };

      return {
        theme,
        themeName,
        get colors() {
          return store.currentTheme.colors;
        },
        availableThemes,
        setTheme,
        cycleTheme,
        getColor,
      };
    },
  });

const loadSavedTheme = (): string => {
  try {
    const saved = process.env["CODETYPER_THEME"];
    if (saved && saved in THEMES) {
      return saved;
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_THEME;
};

const saveTheme = (_name: string): void => {
  // Theme persistence could be implemented here
  // For now, themes are session-only
};
