/**
 * Copilot Usage Components
 *
 * Display Copilot quota usage in the Activity Panel
 * with color-coded progress bars
 */

import { Show, createMemo, type JSX } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { PROGRESS_BAR } from "@constants/ui";
import {
  getQuotaStatus,
  calculatePercentRemaining,
} from "@constants/quota-colors";
import { COPILOT_DISPLAY_NAME } from "@constants/copilot";
import type { CopilotQuotaDetail } from "@/types/copilot-usage";

const QUOTA_BAR_WIDTH = 30; // Fits within 36-char panel width

/**
 * Format date for reset display (e.g., "Feb 16" or "2026-02-16")
 */
const formatResetDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  } catch {
    return dateStr;
  }
};

/**
 * Render a colored progress bar
 */
const renderProgressBar = (percent: number, color: string): JSX.Element => {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filledWidth = Math.round((clampedPercent / 100) * QUOTA_BAR_WIDTH);
  const emptyWidth = QUOTA_BAR_WIDTH - filledWidth;

  return (
    <>
      <text fg={color}>{PROGRESS_BAR.FILLED_CHAR.repeat(filledWidth)}</text>
      <text fg={color} attributes={TextAttributes.DIM}>
        {PROGRESS_BAR.EMPTY_CHAR.repeat(emptyWidth)}
      </text>
    </>
  );
};

interface CopilotQuotaBarProps {
  label: string;
  quota: CopilotQuotaDetail | undefined;
  showPercentage?: boolean;
}

/**
 * Display a single quota bar with label and usage
 */
function CopilotQuotaBar(props: CopilotQuotaBarProps) {
  const theme = useTheme();

  const quotaInfo = createMemo(() => {
    if (!props.quota) {
      return {
        percentRemaining: 0,
        percentUsed: 0,
        status: getQuotaStatus(0),
        unlimited: false,
        remaining: 0,
        total: 0,
      };
    }

    if (props.quota.unlimited) {
      return {
        percentRemaining: 100,
        percentUsed: 0,
        status: getQuotaStatus(100),
        unlimited: true,
        remaining: 0,
        total: 0,
      };
    }

    const percentRemaining = calculatePercentRemaining(
      props.quota.remaining,
      props.quota.entitlement,
      props.quota.unlimited,
    );
    const percentUsed = 100 - percentRemaining;

    return {
      percentRemaining,
      percentUsed,
      status: getQuotaStatus(percentRemaining),
      unlimited: false,
      remaining: props.quota.remaining,
      total: props.quota.entitlement,
    };
  });

  const barColor = createMemo(() => {
    const status = quotaInfo().status.color;
    if (status === "error") return theme.colors.error;
    if (status === "warning") return theme.colors.warning;
    return theme.colors.success;
  });

  return (
    <box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <text fg={theme.colors.textDim}>{props.label}</text>

      {/* Progress bar */}
      <box flexDirection="row" marginTop={0}>
        <Show
          when={!quotaInfo().unlimited}
          fallback={
            <>
              <text fg={theme.colors.success}>
                {PROGRESS_BAR.FILLED_CHAR.repeat(QUOTA_BAR_WIDTH)}
              </text>
            </>
          }
        >
          {renderProgressBar(quotaInfo().percentUsed, barColor())}
        </Show>
      </box>

      {/* Usage info */}
      <box flexDirection="row" marginTop={0}>
        <Show
          when={quotaInfo().unlimited}
          fallback={
            <>
              <text fg={barColor()}>
                {Math.round(quotaInfo().percentRemaining)}% left
              </text>
              <Show when={props.showPercentage}>
                <text fg={theme.colors.textDim}>
                  {" "}
                  ({quotaInfo().remaining}/{quotaInfo().total})
                </text>
              </Show>
            </>
          }
        >
          <text fg={theme.colors.success}>Unlimited</text>
        </Show>
      </box>
    </box>
  );
}

/**
 * Main Copilot Usage Section displayed in Activity Panel
 */
export function CopilotUsageSection() {
  const theme = useTheme();
  const app = useAppStore();

  const usage = createMemo(() => app.copilotUsage());
  const loading = createMemo(() => app.copilotUsageLoading());

  const resetDate = createMemo(() => {
    const u = usage();
    return u ? formatResetDate(u.quota_reset_date) : "";
  });

  return (
    <Show when={app.provider() === COPILOT_DISPLAY_NAME}>
      <box flexDirection="column" marginBottom={1}>
        {/* Header */}
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.colors.text} attributes={TextAttributes.BOLD}>
            Copilot Usage
          </text>
          <Show when={loading()}>
            <text fg={theme.colors.textDim}>...</text>
          </Show>
        </box>

        {/* Loading state */}
        <Show
          when={!loading() && usage()}
          fallback={
            <box marginTop={1}>
              <text fg={theme.colors.textDim}>
                {loading() ? "Loading quota..." : "Unable to fetch quota"}
              </text>
            </box>
          }
        >
          <box flexDirection="column" marginTop={1}>
            {/* Premium Requests */}
            <CopilotQuotaBar
              label="Premium Requests"
              quota={usage()?.quota_snapshots.premium_interactions}
            />

            {/* Chat */}
            <CopilotQuotaBar
              label="Chat"
              quota={usage()?.quota_snapshots.chat}
            />

            {/* Completions */}
            <CopilotQuotaBar
              label="Completions"
              quota={usage()?.quota_snapshots.completions}
            />

            {/* Reset date */}
            <box marginTop={0}>
              <text fg={theme.colors.textDim}>Resets {resetDate()}</text>
            </box>
          </box>
        </Show>
      </box>

      {/* Separator */}
      <box marginBottom={1}>
        <text fg={theme.colors.border}>{"─".repeat(34)}</text>
      </box>
    </Show>
  );
}
