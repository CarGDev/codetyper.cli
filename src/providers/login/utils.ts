/**
 * Login utility functions
 */

import { MAX_MODELS_DISPLAY } from "@constants/providers";
import { LOGIN_MESSAGES } from "@constants/login";
import type { Provider } from "@/types/providers";

export const displayModels = async (provider: Provider): Promise<void> => {
  const models = await provider.getModels();

  if (models.length === 0) {
    return;
  }

  console.log(LOGIN_MESSAGES.AVAILABLE_MODELS);

  const displayCount = Math.min(models.length, MAX_MODELS_DISPLAY);

  for (let i = 0; i < displayCount; i++) {
    console.log(`  - ${models[i].name}`);
  }

  if (models.length > MAX_MODELS_DISPLAY) {
    console.log(`  ... and ${models.length - MAX_MODELS_DISPLAY} more`);
  }
};
