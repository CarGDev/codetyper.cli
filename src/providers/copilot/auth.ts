/**
 * Copilot authentication functions
 */

import got from "got";
import {
  GITHUB_CLIENT_ID,
  GITHUB_DEVICE_CODE_URL,
  GITHUB_ACCESS_TOKEN_URL,
} from "@constants/copilot";
import { sleep } from "@providers/copilot/utils";
import type { DeviceCodeResponse, AccessTokenResponse } from "@/types/copilot";

export const initiateDeviceFlow = async (): Promise<DeviceCodeResponse> => {
  const response = await got
    .post(GITHUB_DEVICE_CODE_URL, {
      headers: {
        Accept: "application/json",
      },
      form: {
        client_id: GITHUB_CLIENT_ID,
        scope: "read:user",
      },
    })
    .json<DeviceCodeResponse>();

  return response;
};

export const pollForAccessToken = async (
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<string> => {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;
  let pollInterval = interval;

  while (Date.now() < expiresAt) {
    await sleep(pollInterval * 1000);

    try {
      const response = await got
        .post(GITHUB_ACCESS_TOKEN_URL, {
          headers: {
            Accept: "application/json",
          },
          form: {
            client_id: GITHUB_CLIENT_ID,
            device_code: deviceCode,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          },
        })
        .json<AccessTokenResponse>();

      if (response.access_token) {
        return response.access_token;
      }

      const errorHandlers: Record<string, () => void> = {
        authorization_pending: () => {},
        slow_down: () => {
          pollInterval += 5;
        },
        expired_token: () => {
          throw new Error("Authentication timed out. Please try again.");
        },
        access_denied: () => {
          throw new Error("Authentication was denied by the user.");
        },
      };

      if (response.error) {
        const handler = errorHandlers[response.error];
        if (handler) {
          handler();
          continue;
        }
        throw new Error(
          response.error_description ??
            response.error ??
            "Authentication failed",
        );
      }
    } catch (error) {
      if ((error as Error).message.includes("Authentication")) {
        throw error;
      }
    }
  }

  throw new Error("Authentication timed out. Please try again.");
};
