import {
  infoMessage,
  warningMessage,
  successMessage,
  errorMessage,
} from "@utils/core/terminal";
import { getConfig } from "@services/core/config";
import { getProvider } from "@providers/index.ts";
import { showModels } from "./show-models.ts";
import type { ChatState } from "../state.ts";

export const switchModel = async (
  modelName: string,
  state: ChatState,
): Promise<void> => {
  if (!modelName) {
    warningMessage("Please specify a model name");
    await showModels(state.currentProvider, state.currentModel);
    return;
  }

  // Handle "auto" as a special case
  if (modelName.toLowerCase() === "auto") {
    state.currentModel = "auto";
    successMessage("Switched to model: auto (API will choose)");

    const config = await getConfig();
    config.set("model", "auto");
    await config.save();
    return;
  }

  const provider = getProvider(state.currentProvider);
  const models = await provider.getModels();
  const model = models.find((m) => m.id === modelName || m.name === modelName);

  if (!model) {
    errorMessage(`Model not found: ${modelName}`);
    infoMessage("Use /models to see available models, or use 'auto'");
    return;
  }

  state.currentModel = model.id;
  successMessage(`Switched to model: ${model.name}`);

  // Persist model selection to config
  const config = await getConfig();
  config.set("model", model.id);
  await config.save();
};
