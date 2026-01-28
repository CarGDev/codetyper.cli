/**
 * Logo Component
 * ASCII art logo with gradient colors for the home screen
 */

import React from "react";
import { Box, Text } from "ink";
import { TUI_BANNER, HEADER_GRADIENT_COLORS } from "@constants/tui-components";

export const Logo: React.FC = () => {
  return (
    <Box flexDirection="column" alignItems="center">
      {TUI_BANNER.map((line, i) => (
        <Text
          key={i}
          color={
            HEADER_GRADIENT_COLORS[
              Math.min(i, HEADER_GRADIENT_COLORS.length - 1)
            ]
          }
        >
          {line}
        </Text>
      ))}
    </Box>
  );
};
