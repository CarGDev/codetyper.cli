import { getConfig } from "@services/core/config";
import { displayProvidersStatus } from "@providers/index";

export const showProviders = async (): Promise<void> => {
  const config = await getConfig();
  await displayProvidersStatus(config.get("provider"));
};
