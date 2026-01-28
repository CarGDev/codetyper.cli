/**
 * Ollama login handler
 */

import inquirer from "inquirer";
import chalk from "chalk";

import { DEFAULT_OLLAMA_HOST } from "@constants/providers";
import { LOGIN_MESSAGES, LOGIN_PROMPTS } from "@constants/login";
import { getProvider } from "@providers/registry";
import { loadCredentials, saveCredentials } from "@providers/credentials";
import { displayModels } from "@providers/login/utils";
import type { ProviderName, LoginHandler } from "@/types/providers";

const promptForHost = async (): Promise<string> => {
  const { host } = await inquirer.prompt([
    {
      type: "input",
      name: "host",
      message: LOGIN_PROMPTS.OLLAMA_HOST,
      default: process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    },
  ]);

  return host;
};

const saveAndValidateOllama = async (
  name: ProviderName,
  host: string,
): Promise<boolean> => {
  const provider = getProvider(name);

  await provider.setCredentials({ baseUrl: host });

  const credentials = await loadCredentials();
  credentials[name] = { baseUrl: host };
  await saveCredentials(credentials);

  const validation = await provider.validate();

  if (!validation.valid) {
    console.log(
      chalk.red(`${LOGIN_MESSAGES.CONNECTION_FAILED} ${validation.error}`),
    );
    return false;
  }

  console.log(chalk.green(LOGIN_MESSAGES.OLLAMA_SUCCESS));

  const models = await provider.getModels();

  if (models.length > 0) {
    await displayModels(provider);
  } else {
    console.log(chalk.yellow(LOGIN_MESSAGES.OLLAMA_NO_MODELS));
  }

  return true;
};

export const loginOllama: LoginHandler = async (name) => {
  const host = await promptForHost();
  return saveAndValidateOllama(name, host);
};
