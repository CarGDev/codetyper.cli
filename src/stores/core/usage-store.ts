/**
 * Usage tracking store
 */

import { createStore } from "zustand/vanilla";
import type { UsageStats, UsageEntry } from "@/types/usage";

interface UsageState extends UsageStats {
  history: UsageEntry[];
}

const createInitialStats = (): UsageStats => ({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  requestCount: 0,
  sessionStartTime: Date.now(),
});

const store = createStore<UsageState>(() => ({
  ...createInitialStats(),
  history: [],
}));

export const usageStore = {
  addUsage: (entry: Omit<UsageEntry, "timestamp">) => {
    const newEntry: UsageEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    store.setState((state) => ({
      promptTokens: state.promptTokens + entry.promptTokens,
      completionTokens: state.completionTokens + entry.completionTokens,
      totalTokens: state.totalTokens + entry.totalTokens,
      requestCount: state.requestCount + 1,
      history: [...state.history, newEntry],
    }));
  },

  reset: () => {
    store.setState({
      ...createInitialStats(),
      history: [],
    });
  },

  getStats: (): UsageStats => {
    const state = store.getState();
    return {
      promptTokens: state.promptTokens,
      completionTokens: state.completionTokens,
      totalTokens: state.totalTokens,
      requestCount: state.requestCount,
      sessionStartTime: state.sessionStartTime,
    };
  },

  getHistory: (): UsageEntry[] => {
    return store.getState().history;
  },

  subscribe: store.subscribe,
};
