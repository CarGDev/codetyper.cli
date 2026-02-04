/**
 * Login and logout handler registries
 */

import chalk from "chalk";

import { PROVIDER_INFO } from "@constants/providers";
import { LOGIN_MESSAGES } from "@constants/login";
import { getProvider } from "@providers/core/registry";
import { loadCredentials, saveCredentials } from "@providers/core/credentials";
import { logoutCopilot } from "@providers/copilot";
import { loginCopilot } from "@providers/login/copilot-login";
import { loginOllama } from "@providers/login/ollama-login";
import type {
  ProviderName,
  LoginHandler,
  LogoutHandler,
} from "@/types/providers";

const LOGIN_HANDLERS: Record<ProviderName, LoginHandler> = {
  copilot: loginCopilot,
  ollama: loginOllama,
};

const LOGOUT_HANDLERS: Record<ProviderName, LogoutHandler> = {
  copilot: logoutCopilot,
  ollama: () => {},
};

export const loginProvider = async (name: ProviderName): Promise<boolean> => {
  const provider = getProvider(name);
  const info = PROVIDER_INFO[name];

  console.log(`\n${chalk.bold(`Configure ${provider.displayName}`)}\n`);
  console.log(chalk.gray(info.description));
  console.log();

  const handler = LOGIN_HANDLERS[name];

  if (!handler) {
    console.log(chalk.red(`${LOGIN_MESSAGES.UNKNOWN_PROVIDER} ${name}`));
    return false;
  }

  return handler(name);
};

export const logoutProvider = async (name: ProviderName): Promise<void> => {
  const handler = LOGOUT_HANDLERS[name];
  handler?.();

  const credentials = await loadCredentials();
  credentials[name] = { loggedOut: "true" };
  await saveCredentials(credentials);
};

export const getLogoutHandler = (
  name: ProviderName,
): LogoutHandler | undefined => LOGOUT_HANDLERS[name];
