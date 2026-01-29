/**
 * Usage statistics display for TUI
 */

import { usageStore } from "@stores/usage-store";
import { getUserInfo } from "@providers/copilot/credentials";
import { getCopilotUsage } from "@providers/copilot/usage";
import { PROGRESS_BAR } from "@constants/ui";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
} from "@/types/chat-service";
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

const renderBar = (percent: number): string => {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filledWidth = Math.round((clampedPercent / 100) * PROGRESS_BAR.WIDTH);
  const emptyWidth = PROGRESS_BAR.WIDTH - filledWidth;
  return (
    PROGRESS_BAR.FILLED_CHAR.repeat(filledWidth) +
    PROGRESS_BAR.EMPTY_CHAR.repeat(emptyWidth)
  );
};

const formatQuotaBar = (
  name: string,
  quota: CopilotQuotaDetail | undefined,
  resetInfo?: string,
): string[] => {
  const lines: string[] = [];

  if (!quota) {
    lines.push(name);
    lines.push("N/A");
    return lines;
  }

  if (quota.unlimited) {
    lines.push(name);
    lines.push(PROGRESS_BAR.FILLED_CHAR.repeat(PROGRESS_BAR.WIDTH) + " Unlimited");
    return lines;
  }

  const used = quota.entitlement - quota.remaining;
  const percentUsed =
    quota.entitlement > 0 ? (used / quota.entitlement) * 100 : 0;

  lines.push(name);
  lines.push(`${renderBar(percentUsed)} ${percentUsed.toFixed(0)}% used`);
  if (resetInfo) {
    lines.push(resetInfo);
  }

  return lines;
};

export const showUsageStats = async (
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const stats = usageStore.getStats();
  const sessionDuration = Date.now() - stats.sessionStartTime;

  const lines: string[] = [];

  if (state.provider === "copilot") {
    const userInfo = await getUserInfo();
    const copilotUsage = await getCopilotUsage();

    if (copilotUsage) {
      const resetInfo = `Resets ${copilotUsage.quota_reset_date}`;

      lines.push(
        ...formatQuotaBar(
          "Premium Requests",
          copilotUsage.quota_snapshots.premium_interactions,
          resetInfo,
        ),
      );
      lines.push("");

      lines.push(
        ...formatQuotaBar("Chat", copilotUsage.quota_snapshots.chat, resetInfo),
      );
      lines.push("");

      lines.push(
        ...formatQuotaBar(
          "Completions",
          copilotUsage.quota_snapshots.completions,
          resetInfo,
        ),
      );
      lines.push("");
    }

    lines.push("Account");
    lines.push(`Provider: ${state.provider}`);
    lines.push(`Model: ${state.model ?? "auto"}`);
    if (userInfo) {
      lines.push(`User: ${userInfo.login}`);
    }
    if (copilotUsage) {
      lines.push(`Plan: ${copilotUsage.copilot_plan}`);
    }
    lines.push("");
  } else {
    lines.push("Provider");
    lines.push(`Name: ${state.provider}`);
    lines.push(`Model: ${state.model ?? "auto"}`);
    lines.push("");
  }

  lines.push("Current Session");
  lines.push(
    `Tokens: ${formatNumber(stats.totalTokens)} (${formatNumber(stats.promptTokens)} prompt + ${formatNumber(stats.completionTokens)} completion)`,
  );
  lines.push(`Requests: ${formatNumber(stats.requestCount)}`);
  lines.push(`Duration: ${formatDuration(sessionDuration)}`);
  if (stats.requestCount > 0) {
    const avgTokensPerRequest = Math.round(
      stats.totalTokens / stats.requestCount,
    );
    lines.push(`Avg tokens/request: ${formatNumber(avgTokensPerRequest)}`);
  }

  callbacks.onLog("system", lines.join("\n"));
};
