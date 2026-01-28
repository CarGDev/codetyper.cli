/**
 * Command Suggestion Service - Suggests follow-up commands after changes
 *
 * Detects patterns in file changes and tool executions to suggest
 * commands the user might need to run (e.g., npm install, npm run build).
 */

export { detectProjectContext } from "@services/command-suggestion/context";
export { analyzeFileChange } from "@services/command-suggestion/analyze";
export {
  getPendingSuggestions,
  clearSuggestions,
  removeSuggestion,
  formatSuggestions,
  hasHighPrioritySuggestions,
} from "@services/command-suggestion/format";
export {
  setProjectContext,
  getProjectContext,
  addSuggestion,
  removeSuggestion as removeSuggestionFromState,
  clearSuggestions as clearSuggestionsFromState,
  hasSuggestion,
  getPendingSuggestionsMap,
} from "@services/command-suggestion/state";
export type {
  CommandSuggestion,
  ProjectContext,
  SuggestionPriority,
  SuggestionPattern,
} from "@/types/command-suggestion";

import { detectProjectContext } from "@services/command-suggestion/context";
import {
  setProjectContext,
  clearSuggestions as clearStore,
} from "@services/command-suggestion/state";

export const initSuggestionService = (cwd: string): void => {
  const ctx = detectProjectContext(cwd);
  setProjectContext(ctx);
  clearStore();
};
