/**
 * Show usage statistics command
 */

import chalk from "chalk";
import { usageStore } from "@stores/core/usage-store";
import { getUserInfo } from "@providers/copilot/auth/credentials";
import { getCopilotUsage } from "@providers/copilot/usage";
import { getProvider } from "@providers/core/registry";
import { renderUsageBar, renderUnlimitedBar } from "@utils/menu/progress-bar";
import type { ChatState } from "@commands/components/chat/state";
import type { CopilotQuotaDetail } from "@/types/copilot-usage";

const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const printQuotaBar = (
  name: string,
  quota: CopilotQuotaDetail | undefined,
  resetInfo?: string,
): void => {
  if (!quota) {
    console.log(chalk.bold(name));
    console.log(chalk.gray("N/A"));
    console.log();
    return;
  }

  if (quota.unlimited) {
    renderUnlimitedBar(name).forEach((line) => console.log(line));
    console.log();
    return;
  }

  const used = quota.entitlement - quota.remaining;
  renderUsageBar(name, used, quota.entitlement, resetInfo).forEach((line) =>
    console.log(line),
  );
  console.log();
};

export const showUsage = async (state: ChatState): Promise<void> => {
  const stats = usageStore.getStats();
  const provider = getProvider(state.currentProvider);
  const sessionDuration = Date.now() - stats.sessionStartTime;

  console.log();

  // User info and quota for Copilot
  if (state.currentProvider === "copilot") {
    const userInfo = await getUserInfo();
    const copilotUsage = await getCopilotUsage();

    if (copilotUsage) {
      const resetDate = copilotUsage.quota_reset_date;

      printQuotaBar(
        "Premium Requests",
        copilotUsage.quota_snapshots.premium_interactions,
        `Resets ${resetDate}`,
      );

      printQuotaBar(
        "Chat",
        copilotUsage.quota_snapshots.chat,
        `Resets ${resetDate}`,
      );

      printQuotaBar(
        "Completions",
        copilotUsage.quota_snapshots.completions,
        `Resets ${resetDate}`,
      );
    }

    console.log(chalk.bold("Account"));
    console.log(`${chalk.gray("Provider:")} ${provider.displayName}`);
    console.log(`${chalk.gray("Model:")} ${state.currentModel ?? "auto"}`);
    if (userInfo) {
      console.log(`${chalk.gray("User:")} ${userInfo.login}`);
    }
    if (copilotUsage) {
      console.log(`${chalk.gray("Plan:")} ${copilotUsage.copilot_plan}`);
    }
    console.log();
  } else {
    console.log(chalk.bold("Provider"));
    console.log(`${chalk.gray("Name:")} ${provider.displayName}`);
    console.log(`${chalk.gray("Model:")} ${state.currentModel ?? "auto"}`);
    console.log();
  }

  // Session stats with bar
  console.log(chalk.bold("Current Session"));
  renderUsageBar(
    "Tokens",
    stats.totalTokens,
    stats.totalTokens || 1,
    `${formatNumber(stats.promptTokens)} prompt + ${formatNumber(stats.completionTokens)} completion`,
  )
    .slice(1)
    .forEach((line) => console.log(line));
  console.log(`${chalk.gray("Requests:")} ${formatNumber(stats.requestCount)}`);
  console.log(`${chalk.gray("Duration:")} ${formatDuration(sessionDuration)}`);
  if (stats.requestCount > 0) {
    const avgTokensPerRequest = Math.round(
      stats.totalTokens / stats.requestCount,
    );
    console.log(
      `${chalk.gray("Avg tokens/request:")} ${formatNumber(avgTokensPerRequest)}`,
    );
  }
  console.log();
};
