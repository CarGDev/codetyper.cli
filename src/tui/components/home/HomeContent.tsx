/**
 * HomeContent Component
 * Logo and info content for the home screen (without input)
 */

import React, { useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import { Logo } from "./Logo";

interface HomeContentProps {
  provider: string;
  model: string;
  version: string;
}

export const HomeContent: React.FC<HomeContentProps> = ({
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
  const contentHeight = 7;
  const inputHeight = 4;
  const availableSpace = terminalHeight - contentHeight - inputHeight;
  const topPadding = Math.max(0, Math.floor(availableSpace / 2));

  return (
    <Box flexDirection="column" flexGrow={1}>
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
    </Box>
  );
};
