/**
 * Thinking Indicator Component
 */

import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { ThinkingIndicatorProps } from "@/types/tui";
import {
  THINKING_SPINNER_FRAMES,
  THINKING_SPINNER_INTERVAL,
} from "@constants/tui-components";

export function ThinkingIndicator({
  message,
}: ThinkingIndicatorProps): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % THINKING_SPINNER_FRAMES.length);
    }, THINKING_SPINNER_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box>
      <Text color="magenta">{THINKING_SPINNER_FRAMES[frame]} </Text>
      <Text color="magenta">{message}</Text>
    </Box>
  );
}
