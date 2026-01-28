/**
 * Chat TUI authentication handling
 */

import { AUTH_MESSAGES } from "@constants/chat-service";
import {
  getProviderStatus,
  getCopilotUserInfo,
  logoutProvider,
  initiateDeviceFlow,
  pollForAccessToken,
  completeCopilotLogin,
} from "@providers/index";
import { appStore } from "@tui/index";
import { loadModels } from "@services/chat-tui/models";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
} from "@/types/chat-service";

const PROVIDER_AUTH_HANDLERS: Record<
  string,
  (state: ChatServiceState, callbacks: ChatServiceCallbacks) => Promise<void>
> = {
  copilot: handleCopilotLogin,
  ollama: async (_, callbacks) => {
    callbacks.onLog("system", AUTH_MESSAGES.NO_LOGIN_REQUIRED("ollama"));
  },
};

const PROVIDER_LOGOUT_HANDLERS: Record<
  string,
  (state: ChatServiceState, callbacks: ChatServiceCallbacks) => Promise<void>
> = {
  copilot: handleCopilotLogout,
  ollama: async (state, callbacks) => {
    callbacks.onLog("system", AUTH_MESSAGES.NO_LOGOUT_SUPPORT(state.provider));
  },
};

const PROVIDER_WHOAMI_HANDLERS: Record<
  string,
  (state: ChatServiceState, callbacks: ChatServiceCallbacks) => Promise<void>
> = {
  copilot: handleCopilotWhoami,
  ollama: async (_, callbacks) => {
    callbacks.onLog("system", AUTH_MESSAGES.OLLAMA_NO_AUTH);
  },
};

async function handleCopilotLogin(
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> {
  const status = await getProviderStatus(state.provider);
  if (status.valid) {
    callbacks.onLog("system", AUTH_MESSAGES.ALREADY_LOGGED_IN);
    return;
  }

  try {
    const deviceResponse = await initiateDeviceFlow();
    callbacks.onLog(
      "system",
      AUTH_MESSAGES.COPILOT_AUTH_INSTRUCTIONS(
        deviceResponse.verification_uri,
        deviceResponse.user_code,
      ),
    );

    try {
      const accessToken = await pollForAccessToken(
        deviceResponse.device_code,
        deviceResponse.interval,
        deviceResponse.expires_in,
      );

      await completeCopilotLogin(accessToken);

      const models = await loadModels(state.provider);
      appStore.setAvailableModels(models);

      callbacks.onLog("system", AUTH_MESSAGES.AUTH_SUCCESS);

      const userInfo = await getCopilotUserInfo();
      if (userInfo) {
        callbacks.onLog(
          "system",
          AUTH_MESSAGES.LOGGED_IN_AS(userInfo.login, userInfo.name),
        );
      }
    } catch (pollError) {
      callbacks.onLog(
        "error",
        AUTH_MESSAGES.AUTH_FAILED((pollError as Error).message),
      );
    }
  } catch (error) {
    callbacks.onLog(
      "error",
      AUTH_MESSAGES.AUTH_START_FAILED((error as Error).message),
    );
  }
}

async function handleCopilotLogout(
  _state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> {
  await logoutProvider("copilot");
  callbacks.onLog("system", AUTH_MESSAGES.LOGGED_OUT);
}

async function handleCopilotWhoami(
  _state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> {
  const userInfo = await getCopilotUserInfo();
  if (userInfo) {
    let content = `Logged in as: ${userInfo.login}`;
    if (userInfo.name) content += `\nName: ${userInfo.name}`;
    if (userInfo.email) content += `\nEmail: ${userInfo.email}`;
    callbacks.onLog("system", content);
  } else {
    callbacks.onLog("system", AUTH_MESSAGES.NOT_LOGGED_IN);
  }
}

export const handleLogin = async (
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const handler = PROVIDER_AUTH_HANDLERS[state.provider];
  if (handler) {
    await handler(state, callbacks);
  } else {
    callbacks.onLog("system", AUTH_MESSAGES.NO_LOGIN_REQUIRED(state.provider));
  }
};

export const handleLogout = async (
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const handler = PROVIDER_LOGOUT_HANDLERS[state.provider];
  if (handler) {
    await handler(state, callbacks);
  } else {
    callbacks.onLog("system", AUTH_MESSAGES.NO_LOGOUT_SUPPORT(state.provider));
  }
};

export const showWhoami = async (
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const handler = PROVIDER_WHOAMI_HANDLERS[state.provider];
  if (handler) {
    await handler(state, callbacks);
  }
};
