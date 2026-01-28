/**
 * DiffView Component - Human-readable diff display for TUI
 *
 * Renders git-style diffs with:
 * - Clear file headers
 * - Line numbers
 * - Color-coded additions/deletions
 * - Syntax highlighting based on file type
 * - Hunk separators
 * - Summary statistics
 */

import React from "react";
import { Box, Text } from "ink";
import type { DiffViewProps } from "@/types/tui";
import {
  detectLanguage,
  getLanguageDisplayName,
} from "@utils/syntax-highlight";
import { DiffLine } from "@tui/components/diff-view/line-renderers";

export function DiffView({
  lines,
  filePath,
  additions = 0,
  deletions = 0,
  compact = false,
  language: providedLanguage,
}: DiffViewProps): React.ReactElement {
  // Calculate max line number width for alignment
  const maxLineNum = lines.reduce((max, line) => {
    const oldNum = line.oldLineNum ?? 0;
    const newNum = line.newLineNum ?? 0;
    return Math.max(max, oldNum, newNum);
  }, 0);
  const maxLineNumWidth = Math.max(3, String(maxLineNum).length);

  const showLineNumbers = !compact && lines.length > 0;

  // Auto-detect language from file path if not provided
  const language =
    providedLanguage || (filePath ? detectLanguage(filePath) : undefined);
  const languageDisplay = language
    ? getLanguageDisplayName(language)
    : undefined;

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* File header */}
      {filePath && (
        <Box marginBottom={1}>
          <Text color="blue" bold>
            📄{" "}
          </Text>
          <Text color="white" bold>
            {filePath}
          </Text>
          {languageDisplay && (
            <Text color="gray" dimColor>
              {" "}
              ({languageDisplay})
            </Text>
          )}
        </Box>
      )}

      {/* Diff content */}
      <Box flexDirection="column" paddingLeft={1}>
        {lines.length === 0 ? (
          <Text dimColor>No changes</Text>
        ) : (
          lines.map((line, index) => (
            <DiffLine
              key={index}
              line={line}
              showLineNumbers={showLineNumbers}
              maxLineNumWidth={maxLineNumWidth}
              language={language}
            />
          ))
        )}
      </Box>

      {/* Summary */}
      {(additions > 0 || deletions > 0) && (
        <Box marginTop={1} paddingLeft={1}>
          <Text dimColor>Changes: </Text>
          {additions > 0 && (
            <Text color="green" bold>
              +{additions}{" "}
            </Text>
          )}
          {deletions > 0 && (
            <Text color="red" bold>
              -{deletions}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
