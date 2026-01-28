/**
 * Ollama provider credentials
 */

import { getOllamaBaseUrl, setOllamaBaseUrl } from "@providers/ollama/state";
import type { ProviderCredentials } from "@/types/providers";

export const getOllamaCredentials = async (): Promise<ProviderCredentials> => ({
  baseUrl: getOllamaBaseUrl(),
});

export const setOllamaCredentials = async (
  credentials: ProviderCredentials,
): Promise<void> => {
  if (credentials.baseUrl) {
    setOllamaBaseUrl(credentials.baseUrl);
  }
};
