/**
 * Ollama provider models
 */

import got from "got";

import { OLLAMA_ENDPOINTS } from "@constants/ollama";
import {
  getOllamaBaseUrl,
  getOllamaDefaultModel,
} from "@providers/ollama/state";
import type { ProviderModel } from "@/types/providers";
import type { OllamaTagsResponse, OllamaModelInfo } from "@/types/ollama";

const mapModelToProviderModel = (model: OllamaModelInfo): ProviderModel => ({
  id: model.name,
  name: model.name,
  supportsTools: true,
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
