/**
 * Chat TUI model handling
 */

import { MODEL_MESSAGES } from "@constants/chat-service";
import { getModelContextSize } from "@constants/copilot";
import { getConfig } from "@services/core/config";
import { getProvider } from "@providers/core/registry";
import {
  getDefaultModel,
  getModels as getProviderModels,
} from "@providers/core/chat";
import { appStore } from "@tui-solid/context/app";
import type { ProviderName, ProviderModel } from "@/types/providers";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
  ProviderDisplayInfo,
} from "@/types/chat-service";

export const getProviderInfo = (
  providerName: ProviderName,
): ProviderDisplayInfo => {
  const provider = getProvider(providerName);
  const model = getDefaultModel(providerName);
  return { displayName: provider.displayName, model };
};

export const loadModels = async (
  providerName: ProviderName,
): Promise<ProviderModel[]> => {
  try {
    return await getProviderModels(providerName);
  } catch {
    return [];
  }
};

/**
 * Resolve the context window size for a given provider + model.
 * Uses the Copilot context-size table when available, otherwise
 * falls back to DEFAULT_CONTEXT_SIZE.
 */
const resolveContextMaxTokens = (
  provider: ProviderName,
  modelId: string | undefined,
): number => {
  const effectiveModel = modelId ?? getDefaultModel(provider);
  return getModelContextSize(effectiveModel).input;
};

export const handleModelSelect = async (
  state: ChatServiceState,
  model: string,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  if (model === "auto") {
    state.model = undefined;
    callbacks.onLog("system", MODEL_MESSAGES.MODEL_AUTO);
  } else {
    state.model = model;
    callbacks.onLog("system", MODEL_MESSAGES.MODEL_CHANGED(model));
  }
  appStore.setModel(model);

  // Update context max tokens for the newly selected model
  const effectiveModel = model === "auto" ? undefined : model;
  appStore.setContextMaxTokens(
    resolveContextMaxTokens(state.provider, effectiveModel),
  );

  const config = await getConfig();
  config.set("model", model === "auto" ? undefined : model);
  await config.save();
};
