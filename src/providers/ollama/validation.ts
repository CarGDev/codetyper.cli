/**
 * Ollama provider validation
 */

import got from "got";

import {
  OLLAMA_ENDPOINTS,
  OLLAMA_TIMEOUTS,
  OLLAMA_ERRORS,
} from "@constants/ollama";
import { getOllamaBaseUrl } from "@providers/ollama/state";

export const isOllamaConfigured = async (): Promise<boolean> => {
  return true;
};

export const validateOllama = async (): Promise<{
  valid: boolean;
  error?: string;
}> => {
  const baseUrl = getOllamaBaseUrl();

  try {
    await got.get(`${baseUrl}${OLLAMA_ENDPOINTS.TAGS}`, {
      timeout: { request: OLLAMA_TIMEOUTS.VALIDATION },
    });
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: OLLAMA_ERRORS.NOT_RUNNING(baseUrl),
    };
  }
};
