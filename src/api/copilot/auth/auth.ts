import got from "got";
import {
  GITHUB_CLIENT_ID,
  GITHUB_DEVICE_CODE_URL,
  GITHUB_ACCESS_TOKEN_URL,
} from "@constants/copilot";
import type { DeviceCodeResponse, AccessTokenResponse } from "@/types/copilot";

/**
 * Initiate GitHub device authentication flow
 */
export const requestDeviceCode = async (): Promise<DeviceCodeResponse> => {
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

/**
 * Poll for access token after user authorization
 */
export const requestAccessToken = async (
  deviceCode: string,
): Promise<AccessTokenResponse> => {
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

  return response;
};
