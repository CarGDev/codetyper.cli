/**
 * Copilot Models API
 *
 * Low-level API calls for fetching available models
 */

import got from "got";
import { COPILOT_MODELS_URL } from "@constants/copilot";
import type { CopilotToken } from "@/types/copilot";
import type { ModelsApiResponse } from "@interfaces/CopilotModels";

/**
 * Fetch available models from Copilot API
 */
export const fetchModels = async (
  token: CopilotToken,
): Promise<ModelsApiResponse> => {
  const response = await got
    .get(COPILOT_MODELS_URL, {
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept: "application/json",
        "User-Agent": "GitHubCopilotChat/0.26.7",
        "Editor-Version": "vscode/1.105.1",
        "Editor-Plugin-Version": "copilot-chat/0.26.7",
      },
    })
    .json<ModelsApiResponse>();

  return response;
};
