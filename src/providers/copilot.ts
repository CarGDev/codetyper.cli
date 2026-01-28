/**
 * GitHub Copilot provider for CodeTyper CLI
 * Authenticates via GitHub device flow (independent of Neovim)
 * Falls back to copilot.lua/copilot.vim config if available
 */

import { chat, chatStream } from "@providers/copilot/chat";
import { getModels, getDefaultModel } from "@providers/copilot/models";
import {
  getCredentials,
  setCredentials,
  getUserInfo,
  logout,
  isConfigured,
  validate,
} from "@providers/copilot/credentials";
import {
  initiateDeviceFlow,
  pollForAccessToken,
} from "@providers/copilot/auth";
import {
  COPILOT_PROVIDER_NAME,
  COPILOT_DISPLAY_NAME,
} from "@constants/copilot";
import type { Provider } from "@/types/providers";

// Re-export auth functions for external use
export { initiateDeviceFlow, pollForAccessToken };

// Re-export types
export type { CopilotUserInfo } from "@/types/copilot";

export const copilotProvider: Provider = {
  name: COPILOT_PROVIDER_NAME,
  displayName: COPILOT_DISPLAY_NAME,
  isConfigured,
  validate,
  getModels,
  getDefaultModel,
  chat,
  chatStream,
  getCredentials,
  setCredentials,
};

// Export additional functions
export { getUserInfo as getCopilotUserInfo, logout as logoutCopilot };
