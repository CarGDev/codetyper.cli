/**
 * Provider manager for CodeTyper CLI
 * Handles provider selection, authentication, and credential management
 */

// Re-export types
export * from "@/types/providers";

// Re-export registry functions
export {
  getProvider,
  getAllProviders,
  getProviderNames,
  isValidProvider,
} from "@providers/registry";

// Re-export status functions
export { getProviderStatus, displayProvidersStatus } from "@providers/status";

// Re-export login functions
export {
  loginProvider,
  logoutProvider,
  initializeProviders,
  completeCopilotLogin,
} from "@providers/login";

// Re-export chat functions
export { chat, chatStream, getDefaultModel, getModels } from "@providers/chat";

// Re-export copilot-specific functions
export {
  initiateDeviceFlow,
  pollForAccessToken,
  getCopilotUserInfo as getCopilotUserInfoFn,
} from "@providers/copilot";

// Re-export getCopilotUserInfo with consistent naming
export const getCopilotUserInfo = async (): Promise<{
  login: string;
  name?: string;
  email?: string;
} | null> => {
  const { getCopilotUserInfo: fn } = await import("@providers/copilot");
  return fn();
};
