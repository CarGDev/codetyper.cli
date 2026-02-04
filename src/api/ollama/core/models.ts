/**
 * Ollama Models API
 *
 * Low-level API calls for model management
 */

import got from "got";
import { OLLAMA_ENDPOINTS, OLLAMA_TIMEOUTS } from "@constants/ollama";
import type { OllamaTagsResponse } from "@/types/ollama";

/**
 * Fetch available models from Ollama
 */
export const fetchModels = async (
  baseUrl: string,
): Promise<OllamaTagsResponse> => {
  const response = await got
    .get(`${baseUrl}${OLLAMA_ENDPOINTS.TAGS}`, {
      timeout: { request: OLLAMA_TIMEOUTS.TAGS },
    })
    .json<OllamaTagsResponse>();

  return response;
};

/**
 * Check if Ollama is running and accessible
 */
export const checkHealth = async (baseUrl: string): Promise<boolean> => {
  try {
    await got.get(`${baseUrl}${OLLAMA_ENDPOINTS.TAGS}`, {
      timeout: { request: OLLAMA_TIMEOUTS.VALIDATION },
    });
    return true;
  } catch {
    return false;
  }
};
