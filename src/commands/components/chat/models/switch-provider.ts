import type { Provider as ProviderName } from "@/types/index";
import {
  errorMessage,
  warningMessage,
  infoMessage,
  successMessage,
} from "@utils/core/terminal";
import { getConfig } from "@services/core/config";
import {
  getProvider,
  getProviderStatus,
  getDefaultModel,
} from "@providers/index.ts";
import type { ChatState } from "../state.ts";

export const switchProvider = async (
  providerName: string,
  state: ChatState,
): Promise<void> => {
  if (!providerName) {
    warningMessage("Please specify a provider: copilot, or ollama");
    return;
  }

  const validProviders = ["copilot", "ollama"];
  if (!validProviders.includes(providerName)) {
    errorMessage(`Invalid provider: ${providerName}`);
    infoMessage("Valid providers: " + validProviders.join(", "));
    return;
  }

  const status = await getProviderStatus(providerName as ProviderName);
  if (!status.valid) {
    errorMessage(`Provider ${providerName} is not configured`);
    infoMessage(`Run: codetyper login ${providerName}`);
    return;
  }

  state.currentProvider = providerName as ProviderName;
  state.currentModel = undefined;

  const config = await getConfig();
  config.set("provider", providerName as ProviderName);
  await config.save();

  const provider = getProvider(state.currentProvider);
  const model = getDefaultModel(state.currentProvider);

  successMessage(`Switched to ${provider.displayName}`);
  infoMessage(`Using model: ${model}`);
};
