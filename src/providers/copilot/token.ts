/**
 * Copilot token management
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";
import got from "got";

import { COPILOT_AUTH_URL } from "@constants/copilot";
import { FILES, DIRS } from "@constants/paths";
import {
  getState,
  setOAuthToken,
  setGitHubToken,
} from "@providers/copilot/state";
import type { CopilotToken } from "@/types/copilot";

/**
 * Load cached Copilot token from disk
 */
const loadCachedToken = async (): Promise<CopilotToken | null> => {
  try {
    const data = await readFile(FILES.copilotTokenCache, "utf-8");
    const token = JSON.parse(data) as CopilotToken;

    // Check if token is still valid (with 60 second buffer)
    if (token.expires_at > Date.now() / 1000 + 60) {
      return token;
    }
  } catch {
    // Cache doesn't exist or is invalid
  }
  return null;
};

/**
 * Save Copilot token to disk cache
 */
const saveCachedToken = async (token: CopilotToken): Promise<void> => {
  try {
    await mkdir(DIRS.cache, { recursive: true });
    await writeFile(FILES.copilotTokenCache, JSON.stringify(token), "utf-8");
  } catch {
    // Silently fail - caching is optional
  }
};

const getConfigDir = (): string => {
  const home = homedir();
  const os = platform();

  if (process.env.XDG_CONFIG_HOME && existsSync(process.env.XDG_CONFIG_HOME)) {
    return process.env.XDG_CONFIG_HOME;
  }

  if (os === "linux" || os === "darwin") {
    return join(home, ".config");
  }

  return join(home, "AppData", "Local");
};

const loadTokenFromNeovimConfig = async (): Promise<string | null> => {
  const configDir = getConfigDir();
  const files = ["hosts.json", "apps.json"];

  for (const filename of files) {
    const filePath = join(configDir, "github-copilot", filename);
    if (existsSync(filePath)) {
      try {
        const content = await readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        for (const [key, value] of Object.entries(data)) {
          if (
            key.includes("github.com") &&
            (value as { oauth_token?: string }).oauth_token
          ) {
            return (value as { oauth_token: string }).oauth_token;
          }
        }
      } catch {
        continue;
      }
    }
  }

  return null;
};

export const getOAuthToken = async (): Promise<string | null> => {
  const state = getState();

  if (state.oauthToken) {
    return state.oauthToken;
  }

  if (state.isLoggedOut) {
    return null;
  }

  return loadTokenFromNeovimConfig();
};

export const refreshToken = async (): Promise<CopilotToken> => {
  const state = getState();

  if (!state.oauthToken) {
    const token = await getOAuthToken();
    if (!token) {
      throw new Error(
        "Copilot not authenticated. Run: codetyper login copilot",
      );
    }
    setOAuthToken(token);
  }

  const currentState = getState();

  // Check in-memory cache first
  if (
    currentState.githubToken &&
    currentState.githubToken.expires_at > Date.now() / 1000
  ) {
    return currentState.githubToken;
  }

  // Check disk cache to avoid network request on startup
  const cachedToken = await loadCachedToken();
  if (cachedToken) {
    setGitHubToken(cachedToken);
    return cachedToken;
  }

  // Fetch new token from GitHub
  const response = await got
    .get(COPILOT_AUTH_URL, {
      headers: {
        Authorization: `token ${currentState.oauthToken}`,
        Accept: "application/json",
      },
    })
    .json<CopilotToken>();

  if (!response.token) {
    throw new Error("Failed to refresh Copilot token");
  }

  setGitHubToken(response);

  // Cache to disk for faster startup next time
  saveCachedToken(response).catch(() => {});

  return response;
};

export const buildHeaders = (token: CopilotToken): Record<string, string> => ({
  Authorization: `Bearer ${token.token}`,
  "Content-Type": "application/json",
  "User-Agent": "GitHubCopilotChat/0.26.7",
  "Editor-Version": "vscode/1.105.1",
  "Editor-Plugin-Version": "copilot-chat/0.26.7",
  "Copilot-Integration-Id": "vscode-chat",
  "Openai-Intent": "conversation-edits",
});
