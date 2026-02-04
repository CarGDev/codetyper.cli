/**
 * Copilot credentials management
 */

import got from "got";

import {
  setOAuthToken,
  setGitHubToken,
  setLoggedOut,
  clearCredentials,
} from "@providers/copilot/state";
import { getOAuthToken } from "@providers/copilot/auth/token";
import type { ProviderCredentials } from "@/types/providers";
import type { CopilotUserInfo } from "@/types/copilot";

export const getCredentials = async (): Promise<ProviderCredentials> => {
  const oauthToken = await getOAuthToken();
  return { oauthToken: oauthToken ?? undefined };
};

export const setCredentials = async (
  credentials: ProviderCredentials,
): Promise<void> => {
  if (credentials.oauthToken) {
    setOAuthToken(credentials.oauthToken);
    setGitHubToken(null);
    setLoggedOut(false);
  }
};

export const getUserInfo = async (): Promise<CopilotUserInfo | null> => {
  const oauthToken = await getOAuthToken();
  if (!oauthToken) {
    return null;
  }

  try {
    const response = await got
      .get("https://api.github.com/user", {
        headers: {
          Authorization: `token ${oauthToken}`,
          Accept: "application/json",
          "User-Agent": "CodeTyper-CLI/1.0",
        },
      })
      .json<CopilotUserInfo>();

    return {
      login: response.login,
      name: response.name,
      email: response.email,
    };
  } catch {
    return null;
  }
};

export const logout = (): void => {
  clearCredentials();
};

export const isConfigured = async (): Promise<boolean> => {
  const token = await getOAuthToken();
  return token !== null;
};

export const validate = async (): Promise<{
  valid: boolean;
  error?: string;
}> => {
  try {
    const { refreshToken } = await import("@providers/copilot/auth/token");
    const token = await refreshToken();
    return { valid: !!token.token };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
};
