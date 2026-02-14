import got from "got";
import { COPILOT_AUTH_URL } from "@constants/copilot";
import type { CopilotToken } from "@/types/copilot";

export const fetchCopilotToken = async (
  oauthToken: string,
): Promise<CopilotToken> => {
  const response = await got
    .get(COPILOT_AUTH_URL, {
      headers: {
        Authorization: `token ${oauthToken}`,
        Accept: "application/json",
      },
    })
    .json<CopilotToken>();

  if (!response.token) {
    throw new Error("Failed to refresh Copilot token");
  }

  return response;
};

export const buildCopilotHeaders = (
  token: CopilotToken,
): Record<string, string> => ({
  Authorization: `Bearer ${token.token}`,
  "Content-Type": "application/json",
  "User-Agent": "GitHubCopilotChat/0.26.7",
  "Editor-Version": "vscode/1.105.1",
  "Editor-Plugin-Version": "copilot-chat/0.26.7",
  "Copilot-Integration-Id": "vscode-chat",
  "Openai-Intent": "conversation-edits",
});
