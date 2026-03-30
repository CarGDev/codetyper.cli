/**
 * Ollama provider models
 */

import got from "got";

import { OLLAMA_ENDPOINTS, OLLAMA_TOOL_CAPABLE_PATTERNS } from "@constants/ollama";
import {
  getOllamaBaseUrl,
  getOllamaDefaultModel,
} from "@providers/ollama/state";
import type { ProviderModel } from "@/types/providers";
import type { OllamaTagsResponse, OllamaModelInfo } from "@/types/ollama";

/**
 * Check if an Ollama model supports tool calling based on known patterns
 */
const isToolCapable = (modelName: string): boolean => {
  const lower = modelName.toLowerCase();
  return OLLAMA_TOOL_CAPABLE_PATTERNS.some((pattern) => lower.includes(pattern));
};

const mapModelToProviderModel = (model: OllamaModelInfo): ProviderModel => ({
  id: model.name,
  name: model.name,
  supportsTools: isToolCapable(model.name),
  supportsStreaming: true,
});

export const getOllamaModels = async (): Promise<ProviderModel[]> => {
  const baseUrl = getOllamaBaseUrl();

  try {
    const response = await got
      .get(`${baseUrl}${OLLAMA_ENDPOINTS.TAGS}`)
      .json<OllamaTagsResponse>();

    return response.models.map(mapModelToProviderModel);
  } catch {
    return [];
  }
};

export const getDefaultOllamaModel = (): string => getOllamaDefaultModel();
