import { getConfig } from "@services/config";
import { displayProvidersStatus } from "@providers/index.ts";

export const showProviders = async (): Promise<void> => {
  const config = await getConfig();
  await displayProvidersStatus(config.get("provider"));
};
