/**
 * Header Component - Shows the CodeTyper banner
 */

import React from "react";
import { Box, Text } from "ink";
import type { HeaderProps } from "@/types/tui";
import { TUI_BANNER, HEADER_GRADIENT_COLORS } from "@constants/tui-components";

export function Header({
  version = "0.1.0",
  provider,
  model,
  showBanner = true,
}: HeaderProps): React.ReactElement {
  if (!showBanner) {
    return (
      <Box paddingX={1} marginBottom={1}>
        <Text color="cyan" bold>
          codetyper
        </Text>
        <Text dimColor> - AI Coding Assistant</Text>
      </Box>
    );
  }

  const info: string[] = [];
  if (version) info.push(`v${version}`);
  if (provider) info.push(provider);
  if (model) info.push(model);

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Text> </Text>
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
      <Text> </Text>
      <Text dimColor> AI Coding Assistant</Text>
      <Text> </Text>
      {info.length > 0 && <Text dimColor> {info.join(" | ")}</Text>}
      <Text> </Text>
    </Box>
  );
}
