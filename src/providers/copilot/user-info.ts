/**
 * Copilot User Info Wrapper
 *
 * Provides a consistent interface for getting Copilot user information.
 */

import { getUserInfo } from "@providers/copilot/auth/credentials";

/**
 * Get Copilot user info with consistent interface
 */
export const getCopilotUserInfo = async (): Promise<{
  login: string;
  name?: string;
  email?: string;
} | null> => {
  return getUserInfo();
};
