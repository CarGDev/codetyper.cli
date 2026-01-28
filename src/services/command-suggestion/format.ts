/**
 * Command suggestion formatting and retrieval
 */

import { PRIORITY_ORDER, PRIORITY_ICONS } from "@constants/command-suggestion";
import {
  getPendingSuggestionsMap,
  clearSuggestions as clearStore,
  removeSuggestion as removeFromStore,
} from "@services/command-suggestion/state";
import type { CommandSuggestion } from "@/types/command-suggestion";

export const getPendingSuggestions = (): CommandSuggestion[] => {
  const suggestionsMap = getPendingSuggestionsMap();
  return Array.from(suggestionsMap.values()).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
};

export const clearSuggestions = (): void => clearStore();

export const removeSuggestion = (command: string): void =>
  removeFromStore(command);

export const formatSuggestions = (suggestions: CommandSuggestion[]): string => {
  if (suggestions.length === 0) return "";

  const lines = ["", "Suggested commands:"];

  for (const s of suggestions) {
    const icon = PRIORITY_ICONS[s.priority];
    lines.push(`  ${icon} ${s.command}  (${s.reason})`);
  }

  return lines.join("\n");
};

export const hasHighPrioritySuggestions = (): boolean => {
  const suggestionsMap = getPendingSuggestionsMap();
  return Array.from(suggestionsMap.values()).some((s) => s.priority === "high");
};
