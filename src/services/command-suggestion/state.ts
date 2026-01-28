/**
 * Command suggestion state management
 */

import { createStore } from "zustand/vanilla";

import type {
  CommandSuggestion,
  ProjectContext,
} from "@/types/command-suggestion";

interface SuggestionState {
  pendingSuggestions: Map<string, CommandSuggestion>;
  projectContext: ProjectContext | null;
}

const store = createStore<SuggestionState>(() => ({
  pendingSuggestions: new Map(),
  projectContext: null,
}));

export const getProjectContext = (): ProjectContext | null =>
  store.getState().projectContext;

export const setProjectContext = (ctx: ProjectContext): void => {
  store.setState({ projectContext: ctx });
};

export const addSuggestion = (suggestion: CommandSuggestion): boolean => {
  const { pendingSuggestions } = store.getState();
  if (pendingSuggestions.has(suggestion.command)) {
    return false;
  }
  const newMap = new Map(pendingSuggestions);
  newMap.set(suggestion.command, suggestion);
  store.setState({ pendingSuggestions: newMap });
  return true;
};

export const removeSuggestion = (command: string): void => {
  const { pendingSuggestions } = store.getState();
  const newMap = new Map(pendingSuggestions);
  newMap.delete(command);
  store.setState({ pendingSuggestions: newMap });
};

export const clearSuggestions = (): void => {
  store.setState({ pendingSuggestions: new Map() });
};

export const getPendingSuggestionsMap = (): Map<string, CommandSuggestion> =>
  store.getState().pendingSuggestions;

export const hasSuggestion = (command: string): boolean =>
  store.getState().pendingSuggestions.has(command);

export const subscribeToSuggestions = store.subscribe;
