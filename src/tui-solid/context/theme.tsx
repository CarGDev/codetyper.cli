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
  // Env var takes priority
  try {
    const envTheme = process.env["CODETYPER_THEME"];
    if (envTheme && envTheme in THEMES) {
      return envTheme;
    }
  } catch {
    // Ignore
  }

  // Try saved config file
  try {
    const { readFileSync } = require("fs");
    const { join } = require("path");
    const configDir = process.env.XDG_CONFIG_HOME
      ? join(process.env.XDG_CONFIG_HOME, "codetyper")
      : join(require("os").homedir(), ".config", "codetyper");
    const data = readFileSync(join(configDir, "theme.json"), "utf-8");
    const parsed = JSON.parse(data);
    if (parsed.theme && parsed.theme in THEMES) {
      return parsed.theme;
    }
  } catch {
    // File doesn't exist or is invalid
  }

  return DEFAULT_THEME;
};

const saveTheme = (name: string): void => {
  try {
    const { writeFileSync, mkdirSync } = require("fs");
    const { join } = require("path");
    const configDir = process.env.XDG_CONFIG_HOME
      ? join(process.env.XDG_CONFIG_HOME, "codetyper")
      : join(require("os").homedir(), ".config", "codetyper");
    mkdirSync(configDir, { recursive: true });
    const configPath = join(configDir, "theme.json");
    writeFileSync(configPath, JSON.stringify({ theme: name }), "utf-8");
  } catch {
    // Silently fail — theme persistence is optional
  }
};
