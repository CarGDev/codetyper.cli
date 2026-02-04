/**
 * Config command handler
 */

import {
  errorMessage,
  filePath,
  successMessage,
  hightLigthedJson,
  headerMessage,
  infoMessage,
} from "@utils/core/terminal";
import { getConfig } from "@services/core/config";
import {
  VALID_CONFIG_KEYS,
  VALID_PROVIDERS,
  CONFIG_VALIDATION,
} from "@constants/handlers";
import type { CommandOptions, Provider } from "@/types/index";
import type { ConfigAction, ConfigKey } from "@/types/handlers";

type ConfigActionHandler = (key?: string, value?: string) => Promise<void>;

const showConfig = async (): Promise<void> => {
  const config = await getConfig();
  headerMessage("Configuration");
  const allConfig = config.getAll();
  hightLigthedJson(allConfig);
};

const showPath = async (): Promise<void> => {
  const config = await getConfig();
  const configPath = config.getConfigPath();
  console.log(filePath(configPath));
};

const setConfigValue = async (key?: string, value?: string): Promise<void> => {
  if (!key || value === undefined) {
    errorMessage("Key and value are required");
    return;
  }

  if (!VALID_CONFIG_KEYS.includes(key as ConfigKey)) {
    errorMessage(`Invalid config key: ${key}`);
    infoMessage(`Valid keys: ${VALID_CONFIG_KEYS.join(", ")}`);
    return;
  }

  const config = await getConfig();

  const keySetters: Record<ConfigKey, () => boolean> = {
    provider: () => {
      if (!VALID_PROVIDERS.includes(value as Provider)) {
        errorMessage(`Invalid provider: ${value}`);
        infoMessage(`Valid providers: ${VALID_PROVIDERS.join(", ")}`);
        return false;
      }
      config.set("provider", value as Provider);
      return true;
    },
    model: () => {
      config.set("model", value);
      return true;
    },
    maxIterations: () => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < CONFIG_VALIDATION.MIN_ITERATIONS) {
        errorMessage("maxIterations must be a positive number");
        return false;
      }
      config.set("maxIterations", num);
      return true;
    },
    timeout: () => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < CONFIG_VALIDATION.MIN_TIMEOUT_MS) {
        errorMessage(
          `timeout must be at least ${CONFIG_VALIDATION.MIN_TIMEOUT_MS}ms`,
        );
        return false;
      }
      config.set("timeout", num);
      return true;
    },
  };

  const setter = keySetters[key as ConfigKey];
  const success = setter();

  if (success) {
    await config.save();
    successMessage(`Set ${key} = ${value}`);
  }
};

const CONFIG_ACTION_HANDLERS: Record<ConfigAction, ConfigActionHandler> = {
  show: showConfig,
  path: showPath,
  set: setConfigValue,
};

export const handleConfig = async (options: CommandOptions): Promise<void> => {
  const { action, key, value } = options;

  const handler = CONFIG_ACTION_HANDLERS[action as ConfigAction];

  if (!handler) {
    errorMessage(`Unknown config action: ${action}`);
    return;
  }

  await handler(key, value);
};
