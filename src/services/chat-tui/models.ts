/**
 * Chat TUI model handling
 */

import { MODEL_MESSAGES } from "@constants/chat-service";
import { getConfig } from "@services/config";
import {
  getProvider,
  getDefaultModel,
  getModels as getProviderModels,
} from "@providers/index";
import { appStore } from "@tui/index";
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

  const config = await getConfig();
  config.set("model", model === "auto" ? undefined : model);
  await config.save();
};
