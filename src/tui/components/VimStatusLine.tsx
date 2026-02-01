/**
 * VimStatusLine Component
 *
 * Displays the current vim mode and hints
 */

import React from "react";
import { Box, Text } from "ink";
import { useVimStore } from "@tui/hooks/useVimStore";
import { useThemeColors } from "@tui/hooks/useThemeStore";
import {
  VIM_MODE_LABELS,
  VIM_MODE_COLORS,
  VIM_MODE_HINTS,
} from "@constants/vim";
import type { VimMode } from "@/types/vim";

/**
 * Props for VimStatusLine
 */
interface VimStatusLineProps {
  /** Whether to show hints */
  showHints?: boolean;
  /** Whether to show command buffer in command mode */
  showCommandBuffer?: boolean;
  /** Whether to show search pattern */
  showSearchPattern?: boolean;
}

/**
 * Get mode display color
 */
const getModeColor = (mode: VimMode): string => {
  return VIM_MODE_COLORS[mode] || "white";
};

/**
 * VimStatusLine Component
 */
export const VimStatusLine: React.FC<VimStatusLineProps> = ({
  showHints = true,
  showCommandBuffer = true,
  showSearchPattern = true,
}) => {
  const enabled = useVimStore((state) => state.enabled);
  const mode = useVimStore((state) => state.mode);
  const commandBuffer = useVimStore((state) => state.commandBuffer);
  const searchPattern = useVimStore((state) => state.searchPattern);
  const searchMatches = useVimStore((state) => state.searchMatches);
  const currentMatchIndex = useVimStore((state) => state.currentMatchIndex);
  const colors = useThemeColors();

  // Don't render if vim mode is disabled
  if (!enabled) {
    return null;
  }

  const modeLabel = VIM_MODE_LABELS[mode];
  const modeColor = getModeColor(mode);
  const modeHint = VIM_MODE_HINTS[mode];

  // Build status content
  const renderModeIndicator = () => (
    <Box marginRight={1}>
      <Text backgroundColor={modeColor} color="black" bold>
        {` ${modeLabel} `}
      </Text>
    </Box>
  );

  const renderCommandBuffer = () => {
    if (!showCommandBuffer || mode !== "command" || !commandBuffer) {
      return null;
    }

    return (
      <Box marginRight={1}>
        <Text color={colors.primary}>:</Text>
        <Text color={colors.text}>{commandBuffer.slice(1)}</Text>
        <Text color={colors.primary}>_</Text>
      </Box>
    );
  };

  const renderSearchInfo = () => {
    if (!showSearchPattern || !searchPattern) {
      return null;
    }

    const matchInfo =
      searchMatches.length > 0
        ? ` [${currentMatchIndex + 1}/${searchMatches.length}]`
        : " [no matches]";

    return (
      <Box marginRight={1}>
        <Text color={colors.textDim}>
          /{searchPattern}
          {matchInfo}
        </Text>
      </Box>
    );
  };

  const renderHints = () => {
    if (!showHints || mode === "command") {
      return null;
    }

    return (
      <Box>
        <Text dimColor>{modeHint}</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Box flexDirection="row">
        {renderModeIndicator()}
        {renderCommandBuffer()}
        {renderSearchInfo()}
      </Box>
      {renderHints()}
    </Box>
  );
};

/**
 * Compact vim mode indicator (just the mode label)
 */
export const VimModeIndicator: React.FC = () => {
  const enabled = useVimStore((state) => state.enabled);
  const mode = useVimStore((state) => state.mode);

  if (!enabled) {
    return null;
  }

  const modeLabel = VIM_MODE_LABELS[mode];
  const modeColor = getModeColor(mode);

  return (
    <Text backgroundColor={modeColor} color="black">
      {` ${modeLabel} `}
    </Text>
  );
};

export default VimStatusLine;
