/**
 * Vim Mode Store (Vanilla)
 *
 * Zustand vanilla store for vim mode state management.
 * React hooks are provided separately in tui/hooks/useVimStore.ts
 */

import { createStore } from "zustand/vanilla";
import type { VimState, VimMode, VimSearchMatch, VimConfig } from "@/types/vim";
import { DEFAULT_VIM_CONFIG } from "@constants/vim";

/**
 * Vim store state with actions
 */
export interface VimStoreState extends VimState {
  /** Configuration */
  config: VimConfig;
}

/**
 * Vim store actions
 */
export interface VimStoreActions {
  /** Set vim mode */
  setMode: (mode: VimMode) => void;
  /** Enable vim mode */
  enable: () => void;
  /** Disable vim mode */
  disable: () => void;
  /** Toggle vim mode */
  toggle: () => void;
  /** Set search pattern */
  setSearchPattern: (pattern: string) => void;
  /** Set command buffer */
  setCommandBuffer: (buffer: string) => void;
  /** Append to command buffer */
  appendCommandBuffer: (char: string) => void;
  /** Clear command buffer */
  clearCommandBuffer: () => void;
  /** Set visual start position */
  setVisualStart: (position: number | null) => void;
  /** Set count prefix */
  setCount: (count: number) => void;
  /** Reset count prefix */
  resetCount: () => void;
  /** Set pending operator */
  setPendingOperator: (operator: string | null) => void;
  /** Set search direction */
  setSearchDirection: (direction: "forward" | "backward") => void;
  /** Set register content */
  setRegister: (content: string) => void;
  /** Set search matches */
  setSearchMatches: (matches: VimSearchMatch[]) => void;
  /** Set current match index */
  setCurrentMatchIndex: (index: number) => void;
  /** Go to next match */
  nextMatch: () => void;
  /** Go to previous match */
  prevMatch: () => void;
  /** Clear search */
  clearSearch: () => void;
  /** Set configuration */
  setConfig: (config: Partial<VimConfig>) => void;
  /** Reset to initial state */
  reset: () => void;
}

export type VimStore = VimStoreState & VimStoreActions;

/**
 * Initial vim state
 */
const initialState: VimStoreState = {
  mode: "insert",
  enabled: false,
  searchPattern: "",
  commandBuffer: "",
  visualStart: null,
  count: 0,
  pendingOperator: null,
  searchDirection: "forward",
  register: "",
  searchMatches: [],
  currentMatchIndex: -1,
  config: DEFAULT_VIM_CONFIG,
};

/**
 * Create vim store (vanilla)
 */
export const vimStore = createStore<VimStore>((set, get) => ({
  ...initialState,

  setMode: (mode: VimMode) => {
    set({ mode });
  },

  enable: () => {
    const { config } = get();
    set({
      enabled: true,
      mode: config.startInNormalMode ? "normal" : "insert",
    });
  },

  disable: () => {
    set({
      enabled: false,
      mode: "insert",
    });
  },

  toggle: () => {
    const { enabled } = get();
    if (enabled) {
      get().disable();
    } else {
      get().enable();
    }
  },

  setSearchPattern: (pattern: string) => {
    set({ searchPattern: pattern });
  },

  setCommandBuffer: (buffer: string) => {
    set({ commandBuffer: buffer });
  },

  appendCommandBuffer: (char: string) => {
    set((state) => ({
      commandBuffer: state.commandBuffer + char,
    }));
  },

  clearCommandBuffer: () => {
    set({ commandBuffer: "" });
  },

  setVisualStart: (position: number | null) => {
    set({ visualStart: position });
  },

  setCount: (count: number) => {
    set({ count });
  },

  resetCount: () => {
    set({ count: 0 });
  },

  setPendingOperator: (operator: string | null) => {
    set({ pendingOperator: operator });
  },

  setSearchDirection: (direction: "forward" | "backward") => {
    set({ searchDirection: direction });
  },

  setRegister: (content: string) => {
    set({ register: content });
  },

  setSearchMatches: (matches: VimSearchMatch[]) => {
    set({
      searchMatches: matches,
      currentMatchIndex: matches.length > 0 ? 0 : -1,
    });
  },

  setCurrentMatchIndex: (index: number) => {
    set({ currentMatchIndex: index });
  },

  nextMatch: () => {
    const { searchMatches, currentMatchIndex } = get();
    if (searchMatches.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    set({ currentMatchIndex: nextIndex });
  },

  prevMatch: () => {
    const { searchMatches, currentMatchIndex } = get();
    if (searchMatches.length === 0) return;

    const prevIndex =
      currentMatchIndex <= 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    set({ currentMatchIndex: prevIndex });
  },

  clearSearch: () => {
    set({
      searchPattern: "",
      searchMatches: [],
      currentMatchIndex: -1,
    });
  },

  setConfig: (config: Partial<VimConfig>) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
  },

  reset: () => {
    set(initialState);
  },
}));

/**
 * Vim store actions for non-React access
 */
export const vimActions = {
  setMode: (mode: VimMode) => vimStore.getState().setMode(mode),
  enable: () => vimStore.getState().enable(),
  disable: () => vimStore.getState().disable(),
  toggle: () => vimStore.getState().toggle(),
  setSearchPattern: (pattern: string) =>
    vimStore.getState().setSearchPattern(pattern),
  setCommandBuffer: (buffer: string) =>
    vimStore.getState().setCommandBuffer(buffer),
  appendCommandBuffer: (char: string) =>
    vimStore.getState().appendCommandBuffer(char),
  clearCommandBuffer: () => vimStore.getState().clearCommandBuffer(),
  setVisualStart: (position: number | null) =>
    vimStore.getState().setVisualStart(position),
  setCount: (count: number) => vimStore.getState().setCount(count),
  resetCount: () => vimStore.getState().resetCount(),
  setPendingOperator: (operator: string | null) =>
    vimStore.getState().setPendingOperator(operator),
  setSearchDirection: (direction: "forward" | "backward") =>
    vimStore.getState().setSearchDirection(direction),
  setRegister: (content: string) => vimStore.getState().setRegister(content),
  setSearchMatches: (matches: VimSearchMatch[]) =>
    vimStore.getState().setSearchMatches(matches),
  setCurrentMatchIndex: (index: number) =>
    vimStore.getState().setCurrentMatchIndex(index),
  nextMatch: () => vimStore.getState().nextMatch(),
  prevMatch: () => vimStore.getState().prevMatch(),
  clearSearch: () => vimStore.getState().clearSearch(),
  setConfig: (config: Partial<VimConfig>) =>
    vimStore.getState().setConfig(config),
  reset: () => vimStore.getState().reset(),
  getState: () => vimStore.getState(),
  subscribe: vimStore.subscribe,
};

/**
 * Get current vim mode
 */
export const getVimMode = (): VimMode => {
  return vimStore.getState().mode;
};

/**
 * Check if vim mode is enabled
 */
export const isVimEnabled = (): boolean => {
  return vimStore.getState().enabled;
};

/**
 * Check if in normal mode
 */
export const isNormalMode = (): boolean => {
  const state = vimStore.getState();
  return state.enabled && state.mode === "normal";
};

/**
 * Check if in insert mode
 */
export const isInsertMode = (): boolean => {
  const state = vimStore.getState();
  return !state.enabled || state.mode === "insert";
};

/**
 * Check if in command mode
 */
export const isCommandMode = (): boolean => {
  const state = vimStore.getState();
  return state.enabled && state.mode === "command";
};

/**
 * Check if in visual mode
 */
export const isVisualMode = (): boolean => {
  const state = vimStore.getState();
  return state.enabled && state.mode === "visual";
};
