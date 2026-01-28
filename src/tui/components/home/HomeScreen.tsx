/**
 * HomeScreen Component
 * Main welcome/home screen with logo vertically centered and input at footer
 */

import React, { useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import { Logo } from "./Logo";
import { PromptBox } from "./PromptBox";
import type { HomeScreenProps } from "@types/home-screen";

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSubmit,
  provider,
  model,
  version,
}) => {
  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows ?? 24;

  // Build info line like: "v0.1.74 | GitHub Copilot | gpt-5.1"
  const infoLine = useMemo(() => {
    const parts: string[] = [];
    if (version) parts.push(`v${version}`);
    if (provider) parts.push(provider);
    if (model) parts.push(model);
    return parts.join(" | ");
  }, [version, provider, model]);

  // Calculate spacing to center the logo
  // Logo (3 lines) + subtitle (1) + info (1) + margins (~2) = ~7 lines
  // Input box (~4 lines)
  // So we need (terminalHeight - 7 - 4) / 2 lines of padding above the logo
  const contentHeight = 7;
  const inputHeight = 4;
  const availableSpace = terminalHeight - contentHeight - inputHeight;
  const topPadding = Math.max(0, Math.floor(availableSpace / 2));

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Top padding to center content */}
      {topPadding > 0 && <Box height={topPadding} />}

      {/* Main content area - logo and info */}
      <Box flexDirection="column" alignItems="center">
        {/* Logo with gradient */}
        <Logo />

        {/* Subtitle */}
        <Box marginTop={1}>
          <Text dimColor>AI Coding Assistant</Text>
        </Box>

        {/* Version and provider info */}
        <Box marginTop={1}>
          <Text dimColor>{infoLine}</Text>
        </Box>
      </Box>

      {/* Spacer to push input to bottom */}
      <Box flexGrow={1} />

      {/* Footer with input box - always at bottom, full width */}
      <Box flexDirection="column" flexShrink={0} width="100%">
        <PromptBox onSubmit={onSubmit} />
      </Box>
    </Box>
  );
};
