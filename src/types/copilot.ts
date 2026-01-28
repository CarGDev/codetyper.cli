/**
 * Copilot provider types
 */

import type { ProviderModel } from "@/types/providers";

export interface CopilotToken {
  token: string;
  expires_at: number;
  endpoints?: {
    api?: string;
  };
}

export interface CopilotState {
  oauthToken: string | null;
  githubToken: CopilotToken | null;
  models: ProviderModel[] | null;
  modelsFetchedAt: number | null;
  isLoggedOut: boolean;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface AccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface CopilotUserInfo {
  login: string;
  name?: string;
  email?: string;
}
