/**
 * Copilot models management
 */

import got from "got";

import {
  COPILOT_MODELS_URL,
  COPILOT_MODELS_CACHE_TTL,
  COPILOT_DEFAULT_MODEL,
  COPILOT_FALLBACK_MODELS,
  MODEL_COST_MULTIPLIERS,
  UNLIMITED_MODELS,
  COPILOT_UNLIMITED_MODEL,
} from "@constants/copilot";
import { getState, setModels } from "@providers/copilot/state";
import { refreshToken } from "@providers/copilot/auth/token";
import type { ProviderModel } from "@/types/providers";

interface ModelBilling {
  is_premium: boolean;
  multiplier: number;
  restricted_to?: string[];
}

interface ModelsApiResponse {
  data: Array<{
    id: string;
    name?: string;
    model_picker_enabled?: boolean;
    billing?: ModelBilling;
    capabilities?: {
      type?: string;
      limits?: {
        max_prompt_tokens?: number;
        max_output_tokens?: number;
        max_context_window?: number;
      };
      supports?: {
        tool_calls?: boolean;
        streaming?: boolean;
        vision?: boolean;
      };
    };
  }>;
}

export const getModels = async (): Promise<ProviderModel[]> => {
  const state = getState();

  const isCacheValid =
    state.models &&
    state.modelsFetchedAt &&
    Date.now() - state.modelsFetchedAt < COPILOT_MODELS_CACHE_TTL;

  if (isCacheValid && state.models) {
    return state.models;
  }

  try {
    const token = await refreshToken();
    const response = await got
      .get(COPILOT_MODELS_URL, {
        headers: {
          Authorization: `Bearer ${token.token}`,
          Accept: "application/json",
          "User-Agent": "GitHubCopilotChat/0.30.0",
          "Editor-Version": "vscode/1.100.0",
          "Editor-Plugin-Version": "copilot-chat/0.30.0",
        },
      })
      .json<ModelsApiResponse>();

    const models: ProviderModel[] = [];

    if (response.data) {
      for (const model of response.data) {
        const isChatModel = model.capabilities?.type === "chat";
        const isPickerEnabled = model.model_picker_enabled;

        if (isChatModel && isPickerEnabled) {
          // Get cost multiplier from API billing data, fallback to constants
          const apiMultiplier = model.billing?.multiplier;
          const costMultiplier =
            apiMultiplier !== undefined
              ? apiMultiplier
              : (MODEL_COST_MULTIPLIERS[model.id] ?? 1.0);

          // Model is unlimited if API says not premium, or if multiplier is 0
          const isUnlimited =
            model.billing?.is_premium === false ||
            costMultiplier === 0 ||
            UNLIMITED_MODELS.has(model.id);

          const limits = model.capabilities?.limits;
          models.push({
            id: model.id,
            name: model.name ?? model.id,
            maxTokens: limits?.max_output_tokens,
            maxInputTokens: limits?.max_prompt_tokens,
            contextWindow: limits?.max_context_window,
            supportsTools: model.capabilities?.supports?.tool_calls ?? false,
            supportsStreaming: model.capabilities?.supports?.streaming ?? false,
            supportsVision: model.capabilities?.supports?.vision ?? false,
            costMultiplier,
            isUnlimited,
          });
        }
      }
    }

    const finalModels = models.length > 0 ? models : COPILOT_FALLBACK_MODELS;
    setModels(finalModels);

    return finalModels;
  } catch {
    return COPILOT_FALLBACK_MODELS;
  }
};

export const getDefaultModel = (): string => COPILOT_DEFAULT_MODEL;

export const getUnlimitedModel = (): string => COPILOT_UNLIMITED_MODEL;

/**
 * Check if model is unlimited. Checks fetched API data first, then hardcoded set.
 */
export const isModelUnlimited = (modelId: string): boolean => {
  const state = getState();
  const apiModel = state.models?.find((m) => m.id === modelId);
  if (apiModel) return apiModel.isUnlimited ?? false;
  return UNLIMITED_MODELS.has(modelId);
};

/**
 * Get cost multiplier. Checks fetched API data first, then hardcoded map.
 */
export const getModelCostMultiplier = (modelId: string): number => {
  const state = getState();
  const apiModel = state.models?.find((m) => m.id === modelId);
  if (apiModel?.costMultiplier !== undefined) return apiModel.costMultiplier;
  return MODEL_COST_MULTIPLIERS[modelId] ?? 1.0;
};
