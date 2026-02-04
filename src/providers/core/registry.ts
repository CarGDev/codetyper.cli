/**
 * Provider registry
 */

import { copilotProvider } from "@providers/copilot";
import { ollamaProvider } from "@providers/ollama";
import type { Provider, ProviderName } from "@/types/providers";

const providers: Record<ProviderName, Provider> = {
  copilot: copilotProvider,
  ollama: ollamaProvider,
};

export const getProvider = (name: ProviderName): Provider => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
};

export const getAllProviders = (): Provider[] => Object.values(providers);

export const getProviderNames = (): ProviderName[] =>
  Object.keys(providers) as ProviderName[];

export const isValidProvider = (name: string): name is ProviderName =>
  name in providers;
