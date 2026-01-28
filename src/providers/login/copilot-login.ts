/**
 * Copilot login handler
 */

import inquirer from "inquirer";
import chalk from "chalk";

import {
  LOGIN_MESSAGES,
  LOGIN_PROMPTS,
  AUTH_STEP_PREFIXES,
} from "@constants/login";
import { getProvider } from "@providers/registry";
import { getProviderStatus } from "@providers/status";
import { loadCredentials, saveCredentials } from "@providers/credentials";
import { initiateDeviceFlow, pollForAccessToken } from "@providers/copilot";
import { displayModels } from "@providers/login/utils";
import type { ProviderName, LoginHandler } from "@/types/providers";

const checkExistingAuth = async (
  name: ProviderName,
): Promise<boolean | null> => {
  const status = await getProviderStatus(name);

  if (!status.valid) {
    return null;
  }

  console.log(chalk.green(LOGIN_MESSAGES.COPILOT_ALREADY_CONFIGURED));

  const { reconfigure } = await inquirer.prompt([
    {
      type: "confirm",
      name: "reconfigure",
      message: LOGIN_PROMPTS.RECONFIGURE,
      default: false,
    },
  ]);

  return reconfigure ? null : true;
};

const displayAuthInstructions = (
  verificationUri: string,
  userCode: string,
): void => {
  console.log(chalk.bold(LOGIN_MESSAGES.COPILOT_AUTH_INSTRUCTIONS));
  console.log(
    `${AUTH_STEP_PREFIXES.OPEN_URL} ${chalk.cyan.underline(verificationUri)}`,
  );
  console.log(
    `${AUTH_STEP_PREFIXES.ENTER_CODE} ${chalk.yellow.bold(userCode)}\n`,
  );
  console.log(chalk.gray(LOGIN_MESSAGES.COPILOT_WAITING));
};

const performDeviceFlowAuth = async (): Promise<{
  success: boolean;
  accessToken?: string;
}> => {
  console.log(chalk.cyan(LOGIN_MESSAGES.COPILOT_STARTING_AUTH));

  try {
    const deviceResponse = await initiateDeviceFlow();

    displayAuthInstructions(
      deviceResponse.verification_uri,
      deviceResponse.user_code,
    );

    const accessToken = await pollForAccessToken(
      deviceResponse.device_code,
      deviceResponse.interval,
      deviceResponse.expires_in,
    );

    return { success: true, accessToken };
  } catch (error) {
    console.log(
      chalk.red(`${LOGIN_MESSAGES.AUTH_FAILED} ${(error as Error).message}`),
    );
    return { success: false };
  }
};

const saveAndValidateCredentials = async (
  name: ProviderName,
  accessToken: string,
): Promise<boolean> => {
  const provider = getProvider(name);

  await provider.setCredentials({ oauthToken: accessToken });

  const credentials = await loadCredentials();
  credentials[name] = { oauthToken: accessToken };
  await saveCredentials(credentials);

  const validation = await provider.validate();

  if (validation.valid) {
    console.log(chalk.green(LOGIN_MESSAGES.COPILOT_SUCCESS));
    await displayModels(provider);
    return true;
  }

  console.log(
    chalk.red(`${LOGIN_MESSAGES.VALIDATION_FAILED} ${validation.error}`),
  );
  return false;
};

export const loginCopilot: LoginHandler = async (name) => {
  const existingAuth = await checkExistingAuth(name);

  if (existingAuth !== null) {
    return existingAuth;
  }

  const authResult = await performDeviceFlowAuth();

  if (!authResult.success || !authResult.accessToken) {
    return false;
  }

  return saveAndValidateCredentials(name, authResult.accessToken);
};
