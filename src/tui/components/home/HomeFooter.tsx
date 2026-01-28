/**
 * HomeFooter Component
 * Bottom status bar showing directory, MCP status, and version
 */

import React from "react";
import { Box, Text } from "ink";
import { useThemeColors } from "@stores/theme-store";
import { MCP_INDICATORS } from "@constants/home-screen";
import type { HomeFooterProps } from "@types/home-screen";

export const HomeFooter: React.FC<HomeFooterProps> = ({
  directory,
  mcpConnectedCount,
  mcpHasErrors,
  version,
}) => {
  const colors = useThemeColors();

  const mcpStatusColor = mcpHasErrors
    ? colors.error
    : mcpConnectedCount > 0
      ? colors.success
      : colors.textDim;

  return (
    <Box
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      flexDirection="row"
      flexShrink={0}
      gap={2}
    >
      <Text color={colors.textDim}>{directory}</Text>

      {mcpConnectedCount > 0 && (
        <Box gap={1} flexDirection="row" flexShrink={0}>
          <Text color={colors.text}>
            <Text color={mcpStatusColor}>{MCP_INDICATORS.connected} </Text>
            {mcpConnectedCount} MCP
          </Text>
          <Text color={colors.textDim}>/status</Text>
        </Box>
      )}

      <Box flexGrow={1} />

      <Box flexShrink={0}>
        <Text color={colors.textDim}>v{version}</Text>
      </Box>
    </Box>
  );
};
