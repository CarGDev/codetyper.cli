/**
 * FilePicker Component - Interactive file/folder selector (Presentation Only)
 *
 * This component is purely presentational. All filesystem operations
 * are handled by the parent via the filePickerState prop.
 *
 * - Triggered by @ or / in input
 * - Filters as you type
 * - Up/Down to navigate, Enter to select
 * - Tab to enter directories
 * - Escape to cancel
 */

import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { dirname, relative } from "path";
import type {
  FileEntry,
  FilePickerState,
} from "@/services/file-picker-service";

interface FilePickerProps {
  query: string;
  cwd: string;
  filePickerState: FilePickerState;
  onSelect: (path: string) => void;
  onCancel: () => void;
  onQueryChange: (query: string) => void;
  isActive?: boolean;
}

export function FilePicker({
  query,
  cwd,
  filePickerState,
  onSelect,
  onCancel,
  onQueryChange,
  isActive = true,
}: FilePickerProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get filtered files from state manager
  const filteredFiles = useMemo(
    () => filePickerState.filterFiles(query, 15),
    [filePickerState, query],
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useInput(
    (input, key) => {
      if (!isActive) return;

      // Cancel
      if (key.escape) {
        onCancel();
        return;
      }

      // Navigate
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) =>
          Math.min(filteredFiles.length - 1, prev + 1),
        );
        return;
      }

      // Select
      if (key.return && filteredFiles.length > 0) {
        const selected = filteredFiles[selectedIndex];
        if (selected) {
          onSelect(selected.relativePath);
        }
        return;
      }

      // Tab to enter directory
      if (key.tab && filteredFiles.length > 0) {
        const selected = filteredFiles[selectedIndex];
        if (selected?.isDirectory) {
          filePickerState.setCurrentDir(selected.path);
          onQueryChange("");
        }
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        if (query.length > 0) {
          onQueryChange(query.slice(0, -1));
        } else {
          // Go up a directory
          const currentDir = filePickerState.getCurrentDir();
          const parent = dirname(currentDir);
          if (parent !== currentDir) {
            filePickerState.setCurrentDir(parent);
          }
        }
        return;
      }

      // Type filter
      if (input && !key.ctrl && !key.meta) {
        onQueryChange(query + input);
      }
    },
    { isActive },
  );

  const relativeDir = relative(cwd, filePickerState.getCurrentDir()) || ".";

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      marginBottom={1}
    >
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          Select file or folder
        </Text>
        <Text dimColor> ({relativeDir})</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">Filter: </Text>
        <Text>{query || <Text dimColor>type to filter...</Text>}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {filteredFiles.length === 0 ? (
          <Text dimColor>No matching files</Text>
        ) : (
          filteredFiles.map((file: FileEntry, index: number) => {
            const isSelected = index === selectedIndex;
            const icon = file.isDirectory ? "📁" : "📄";

            return (
              <Box key={file.path}>
                <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                  {isSelected ? "❯ " : "  "}
                  {icon} {file.relativePath}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box>
        <Text dimColor>
          ↑↓ navigate • Enter select • Tab enter dir • Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
