/**
 * Copilot provider state management
 */

import type { CopilotState } from "@/types/copilot";

const createInitialState = (): CopilotState => ({
  oauthToken: null,
  githubToken: null,
  models: null,
  modelsFetchedAt: null,
  isLoggedOut: false,
});

let state: CopilotState = createInitialState();

export const getState = (): CopilotState => state;

export const setState = (newState: Partial<CopilotState>): void => {
  state = { ...state, ...newState };
};

export const resetState = (): void => {
  state = createInitialState();
};

export const setOAuthToken = (token: string | null): void => {
  state.oauthToken = token;
};

export const setGitHubToken = (token: CopilotState["githubToken"]): void => {
  state.githubToken = token;
};

export const setModels = (models: CopilotState["models"]): void => {
  state.models = models;
  state.modelsFetchedAt = models ? Date.now() : null;
};

export const setLoggedOut = (isLoggedOut: boolean): void => {
  state.isLoggedOut = isLoggedOut;
};

export const clearCredentials = (): void => {
  state.oauthToken = null;
  state.githubToken = null;
  state.models = null;
  state.modelsFetchedAt = null;
  state.isLoggedOut = true;
};
