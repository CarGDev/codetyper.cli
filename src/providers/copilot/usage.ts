/**
 * Copilot usage/quota fetching
 */

import got from "got";

import { getOAuthToken } from "@providers/copilot/token";
import type { CopilotUsageResponse } from "@/types/copilot-usage";

const COPILOT_USER_URL = "https://api.github.com/copilot_internal/user";

export const getCopilotUsage =
  async (): Promise<CopilotUsageResponse | null> => {
    const oauthToken = await getOAuthToken();
    if (!oauthToken) {
      return null;
    }

    try {
      const response = await got
        .get(COPILOT_USER_URL, {
          headers: {
            Authorization: `token ${oauthToken}`,
            Accept: "application/json",
            "User-Agent": "CodeTyper-CLI/1.0",
          },
        })
        .json<CopilotUsageResponse>();

      return response;
    } catch {
      return null;
    }
  };
