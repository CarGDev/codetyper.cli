/**
 * Streaming Message Component
 *
 * Renders an assistant message that updates in real-time as content streams in.
 * Shows a cursor indicator while streaming is active.
 */

import React from "react";
import { Box, Text } from "ink";
import type { LogEntry } from "@/types/tui";

// =============================================================================
// Props
// =============================================================================

interface StreamingMessageProps {
  entry: LogEntry;
}

// =============================================================================
// Streaming Cursor Component
// =============================================================================

const StreamingCursor: React.FC = () => {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <Text color="green">{visible ? "▌" : " "}</Text>;
};

// =============================================================================
// Main Component
// =============================================================================

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  entry,
}) => {
  const isStreaming = entry.metadata?.isStreaming ?? false;
  const content = entry.content || "";

  // Split content into lines for display
  const lines = content.split("\n");
  const lastLineIndex = lines.length - 1;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="green" bold>
        CodeTyper
      </Text>
      <Box marginLeft={2} flexDirection="column">
        {lines.map((line, index) => (
          <Box key={index}>
            <Text>{line}</Text>
            {isStreaming && index === lastLineIndex && <StreamingCursor />}
          </Box>
        ))}
        {content === "" && isStreaming && (
          <Box>
            <StreamingCursor />
          </Box>
        )}
      </Box>
    </Box>
  );
};

// =============================================================================
// Export
// =============================================================================

export default StreamingMessage;
