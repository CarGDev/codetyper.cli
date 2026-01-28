/**
 * SessionHeader Component
 * Header showing session title, token count, cost, and version
 */

import React from "react";
import { Box, Text } from "ink";
import { useThemeColors } from "@stores/theme-store";
import type { SessionHeaderProps } from "@types/home-screen";

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

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  title,
  tokenCount,
  contextPercentage,
  cost,
  version,
}) => {
  const colors = useThemeColors();

  const contextInfo =
    contextPercentage !== undefined
      ? `${formatTokenCount(tokenCount)} ${contextPercentage}%`
      : formatTokenCount(tokenCount);

  return (
    <Box
      flexShrink={0}
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
        {/* Title */}
        <Text color={colors.text}>
          <Text bold>#</Text> <Text bold>{title}</Text>
        </Text>

        {/* Context info and version */}
        <Box flexDirection="row" gap={1} flexShrink={0}>
          <Text color={colors.textDim}>
            {contextInfo} ({formatCost(cost)})
          </Text>
          <Text color={colors.textDim}>v{version}</Text>
        </Box>
      </Box>
    </Box>
  );
};
