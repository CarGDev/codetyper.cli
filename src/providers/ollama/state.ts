/**
 * Ollama provider state management
 */

import { createStore } from "zustand/vanilla";

import { OLLAMA_DEFAULTS } from "@constants/ollama";
import type { OllamaState } from "@/types/ollama";

const store = createStore<OllamaState>(() => ({
  baseUrl: OLLAMA_DEFAULTS.BASE_URL,
  defaultModel: OLLAMA_DEFAULTS.MODEL,
}));

export const getOllamaBaseUrl = (): string =>
  process.env.OLLAMA_HOST || store.getState().baseUrl;

export const getOllamaDefaultModel = (): string =>
  store.getState().defaultModel;

export const setOllamaBaseUrl = (url: string): void => {
  store.setState({ baseUrl: url });
};

export const setOllamaDefaultModel = (model: string): void => {
  store.setState({ defaultModel: model });
};

export const subscribeToOllama = store.subscribe;
