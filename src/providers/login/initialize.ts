/**
 * Provider initialization
 */

import { getProvider, isValidProvider } from "@providers/registry";
import { loadCredentials, saveCredentials } from "@providers/credentials";
import { getLogoutHandler } from "@providers/login/handlers";
import type { ProviderName } from "@/types/providers";

export const initializeProviders = async (): Promise<void> => {
  const credentials = await loadCredentials();
  const providerNames = Object.keys(credentials);

  for (const name of providerNames) {
    if (!isValidProvider(name)) {
      continue;
    }

    const creds = credentials[name];

    if (creds.loggedOut === "true") {
      const handler = getLogoutHandler(name as ProviderName);
      handler?.();
      continue;
    }

    try {
      const provider = getProvider(name as ProviderName);
      await provider.setCredentials(creds);
    } catch {
      // Ignore errors
    }
  }
};

export const completeCopilotLogin = async (
  accessToken: string,
): Promise<void> => {
  const provider = getProvider("copilot");
  await provider.setCredentials({ oauthToken: accessToken });

  const credentials = await loadCredentials();
  credentials["copilot"] = { oauthToken: accessToken };
  await saveCredentials(credentials);
};
