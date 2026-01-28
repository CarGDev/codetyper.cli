/**
 * Provider status functions
 */

import chalk from "chalk";

import { PROVIDER_INFO } from "@constants/providers";
import { getProvider, getProviderNames } from "@providers/registry";
import type { ProviderName, ProviderStatus } from "@/types/providers";

export const getProviderStatus = async (
  name: ProviderName,
): Promise<ProviderStatus> => {
  const provider = getProvider(name);

  const configured = await provider.isConfigured();
  if (!configured) {
    return { configured: false, valid: false };
  }

  const validation = await provider.validate();
  return {
    configured: true,
    valid: validation.valid,
    error: validation.error,
  };
};

const getStatusIcon = (status: ProviderStatus): string => {
  if (status.valid) return chalk.green("✓");
  if (status.configured) return chalk.yellow("!");
  return chalk.gray("○");
};

const getStatusText = (status: ProviderStatus): string => {
  if (status.valid) return chalk.green("Connected");
  if (status.configured) return chalk.yellow(status.error ?? "Invalid");
  return chalk.gray("Not configured");
};

export const displayProvidersStatus = async (
  currentProvider: ProviderName,
): Promise<void> => {
  console.log("\n" + chalk.bold.underline("LLM Providers") + "\n");

  for (const name of getProviderNames()) {
    const provider = getProvider(name);
    const status = await getProviderStatus(name);
    const info = PROVIDER_INFO[name];

    const marker = currentProvider === name ? chalk.cyan("→") : " ";
    const statusIcon = getStatusIcon(status);
    const statusText = getStatusText(status);

    console.log(`${marker} ${chalk.bold(provider.displayName)}`);
    console.log(`   Status: ${statusIcon} ${statusText}`);
    console.log(`   ${chalk.gray(info.description)}`);

    if (!status.configured) {
      console.log(`   ${chalk.gray(`Run: codetyper login ${name}`)}`);
    }
    console.log();
  }

  console.log(chalk.bold("Current:") + ` ${chalk.cyan(currentProvider)}`);
  console.log(
    chalk.gray(
      "Use /provider <name> to switch, or codetyper login <provider> to configure\n",
    ),
  );
};
