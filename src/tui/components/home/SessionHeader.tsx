/**
 * SessionHeader Component
 * Header showing session title, token count, cost, version, and brain status
 */

import React from "react";
import { Box, Text } from "ink";
import { useThemeColors } from "@tui/hooks/useThemeStore";
import type { SessionHeaderProps } from "@types/home-screen";
import { BRAIN_BANNER } from "@constants/brain";

const formatCost = (cost: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cost);
};

const formatTokenCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toLocaleString();
};

const MODE_COLORS: Record<string, string> = {
  agent: "cyan",
  ask: "green",
  "code-review": "yellow",
};

const MODE_LABELS: Record<string, string> = {
  agent: "AGENT",
  ask: "ASK",
  "code-review": "REVIEW",
};

const BRAIN_STATUS_COLORS: Record<string, string> = {
  connected: "green",
  connecting: "yellow",
  disconnected: "gray",
  error: "red",
};

const BRAIN_STATUS_ICONS: Record<string, string> = {
  connected: BRAIN_BANNER.EMOJI_CONNECTED,
  connecting: "...",
  disconnected: BRAIN_BANNER.EMOJI_DISCONNECTED,
  error: "!",
};

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  title,
  tokenCount,
  contextPercentage,
  cost,
  version,
  interactionMode = "agent",
  brain,
  onDismissBrainBanner,
}) => {
  const colors = useThemeColors();

  const contextInfo =
    contextPercentage !== undefined
      ? `${formatTokenCount(tokenCount)} ${contextPercentage}%`
      : formatTokenCount(tokenCount);

  const modeColor = MODE_COLORS[interactionMode] || "cyan";
  const modeLabel = MODE_LABELS[interactionMode] || interactionMode.toUpperCase();

  const brainStatus = brain?.status ?? "disconnected";
  const brainColor = BRAIN_STATUS_COLORS[brainStatus] || "gray";
  const brainIcon = BRAIN_STATUS_ICONS[brainStatus] || BRAIN_BANNER.EMOJI_DISCONNECTED;
  const showBrainBanner = brain?.showBanner && brainStatus === "disconnected";

  return (
    <Box flexDirection="column" flexShrink={0}>
      {/* Brain Banner - shown when not connected */}
      {showBrainBanner && (
        <Box
          paddingLeft={2}
          paddingRight={2}
          paddingTop={0}
          paddingBottom={0}
          backgroundColor="#1a1a2e"
        >
          <Box flexDirection="row" justifyContent="space-between" width="100%">
            <Box flexDirection="row" gap={1}>
              <Text color="magenta" bold>
                {BRAIN_BANNER.EMOJI_CONNECTED}
              </Text>
              <Text color="white" bold>
                {BRAIN_BANNER.TITLE}
              </Text>
              <Text color="gray">
                {" "}
                - {BRAIN_BANNER.CTA}:{" "}
              </Text>
              <Text color="cyan" underline>
                {BRAIN_BANNER.URL}
              </Text>
            </Box>
            <Text color="gray" dimColor>
              [press q to dismiss]
            </Text>
          </Box>
        </Box>
      )}

      {/* Main Header */}
      <Box
        borderStyle="single"
        borderLeft={true}
        borderRight={false}
        borderTop={false}
        borderBottom={false}
        borderColor={colors.border}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={1}
        backgroundColor={colors.backgroundPanel}
      >
        <Box flexDirection="row" justifyContent="space-between" width="100%">
          {/* Title and Mode */}
          <Box flexDirection="row" gap={2}>
            <Text color={colors.text}>
              <Text bold>#</Text> <Text bold>{title}</Text>
            </Text>
            <Text color={modeColor} bold>
              [{modeLabel}]
            </Text>
          </Box>

          {/* Brain status, Context info and version */}
          <Box flexDirection="row" gap={1} flexShrink={0}>
            {/* Brain status indicator */}
            {brain && (
              <Box flexDirection="row" gap={0}>
                <Text color={brainColor}>
                  {brainIcon}
                </Text>
                {brainStatus === "connected" && (
                  <Text color={colors.textDim}>
                    {" "}
                    {brain.knowledgeCount}K/{brain.memoryCount}M
                  </Text>
                )}
              </Box>
            )}
            <Text color={colors.textDim}>
              {contextInfo} ({formatCost(cost)})
            </Text>
            <Text color={colors.textDim}>v{version}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
