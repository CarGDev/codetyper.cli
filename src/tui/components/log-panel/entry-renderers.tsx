/**
 * Log Entry Renderer Components
 *
 * Each entry type has its own renderer function
 */

import React from "react";
import { Box, Text } from "ink";
import type { LogEntry, LogEntryProps, ToolStatus } from "@/types/tui";
import {
  TOOL_STATUS_ICONS,
  TOOL_STATUS_COLORS,
  type ToolStatusColor,
} from "@constants/tui-components";
import {
  DiffView,
  parseDiffOutput,
  isDiffContent,
} from "@tui/components/DiffView";
import { StreamingMessage } from "@tui/components/StreamingMessage";

// ============================================================================
// Entry Renderers by Type
// ============================================================================

const renderUserEntry = (entry: LogEntry): React.ReactElement => (
  <Box flexDirection="column" marginBottom={1}>
    <Text color="cyan" bold>
      You
    </Text>
    <Box marginLeft={2}>
      <Text>{entry.content}</Text>
    </Box>
  </Box>
);

const renderAssistantEntry = (entry: LogEntry): React.ReactElement => (
  <Box flexDirection="column" marginBottom={1}>
    <Text color="green" bold>
      CodeTyper
    </Text>
    <Box marginLeft={2}>
      <Text>{entry.content}</Text>
    </Box>
  </Box>
);

const renderErrorEntry = (entry: LogEntry): React.ReactElement => (
  <Box marginBottom={1}>
    <Text color="red">✗ Error: {entry.content}</Text>
  </Box>
);

const renderSystemEntry = (entry: LogEntry): React.ReactElement => (
  <Box marginBottom={1}>
    <Text dimColor>⚙ {entry.content}</Text>
  </Box>
);

const renderThinkingEntry = (entry: LogEntry): React.ReactElement => (
  <Box marginBottom={1}>
    <Text color="magenta">● {entry.content}</Text>
  </Box>
);

const renderDefaultEntry = (entry: LogEntry): React.ReactElement => (
  <Box marginBottom={1}>
    <Text>{entry.content}</Text>
  </Box>
);

const renderToolEntry = (entry: LogEntry): React.ReactElement => {
  const toolStatus: ToolStatus = entry.metadata?.toolStatus ?? "pending";
  const statusIcon = TOOL_STATUS_ICONS[toolStatus];
  const statusColor = TOOL_STATUS_COLORS[toolStatus] as ToolStatusColor;

  // Check if content contains diff output
  const hasDiff =
    entry.metadata?.diffData?.isDiff || isDiffContent(entry.content);

  if (hasDiff && entry.metadata?.toolStatus === "success") {
    const diffData = parseDiffOutput(entry.content);
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={statusColor}>{statusIcon} </Text>
          <Text color="yellow">{entry.metadata?.toolName || "tool"}</Text>
          {entry.metadata?.toolDescription && (
            <>
              <Text dimColor>: </Text>
              <Text dimColor>{entry.metadata.toolDescription}</Text>
            </>
          )}
        </Box>
        <Box marginLeft={2}>
          <DiffView
            lines={diffData.lines}
            filePath={diffData.filePath}
            additions={diffData.additions}
            deletions={diffData.deletions}
            compact={false}
          />
        </Box>
      </Box>
    );
  }

  // Check if content is multiline (file read output)
  const isMultiline = entry.content.includes("\n");

  if (isMultiline) {
    // Render multiline content compactly in a column layout
    const lines = entry.content.split("\n");
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={statusColor}>{statusIcon} </Text>
          <Text color="yellow">{entry.metadata?.toolName || "tool"}</Text>
          <Text dimColor>: </Text>
          <Text dimColor>{entry.metadata?.toolDescription || lines[0]}</Text>
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          {lines
            .slice(entry.metadata?.toolDescription ? 0 : 1)
            .map((line, i) => (
              <Text key={i} dimColor>
                {line}
              </Text>
            ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text color={statusColor}>{statusIcon} </Text>
      <Text color="yellow">{entry.metadata?.toolName || "tool"}</Text>
      <Text dimColor>: </Text>
      <Text dimColor>{entry.content}</Text>
    </Box>
  );
};

// ============================================================================
// Entry Renderer Registry
// ============================================================================

type EntryRenderer = (entry: LogEntry) => React.ReactElement;

const renderStreamingEntry = (entry: LogEntry): React.ReactElement => (
  <StreamingMessage entry={entry} />
);

const ENTRY_RENDERERS: Record<string, EntryRenderer> = {
  user: renderUserEntry,
  assistant: renderAssistantEntry,
  assistant_streaming: renderStreamingEntry,
  tool: renderToolEntry,
  error: renderErrorEntry,
  system: renderSystemEntry,
  thinking: renderThinkingEntry,
};

// ============================================================================
// Main Export
// ============================================================================

export function LogEntryDisplay({ entry }: LogEntryProps): React.ReactElement {
  const renderer = ENTRY_RENDERERS[entry.type] ?? renderDefaultEntry;
  return renderer(entry);
}
