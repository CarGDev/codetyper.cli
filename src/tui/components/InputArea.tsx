/**
 * Input Area Component - Multi-line input with Enter/Alt+Enter handling
 *
 * - Enter: Submit message
 * - Alt+Enter (Option+Enter): Insert newline
 * - @ or /: Open file picker to add files as context
 */

import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { useAppStore } from "@tui/store";
import { FilePicker } from "@tui/components/FilePicker";
import { BouncingLoader } from "@tui/components/BouncingLoader";
import { createFilePickerState } from "@/services/file-picker-service";

interface InputAreaProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
}

export function InputArea({
  onSubmit,
  placeholder = "Type your message...",
}: InputAreaProps): React.ReactElement {
  // Use local state for responsive input handling
  const [buffer, setBuffer] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  // File picker state
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [filePickerQuery, setFilePickerQuery] = useState("");
  const [filePickerTrigger, setFilePickerTrigger] = useState<"@" | "/">("@");
  const filePickerState = useMemo(
    () => createFilePickerState(process.cwd()),
    [],
  );

  const mode = useAppStore((state) => state.mode);
  const isLocked =
    mode === "thinking" ||
    mode === "tool_execution" ||
    mode === "permission_prompt";

  // Cursor blink effect
  useEffect(() => {
    if (isLocked) return;

    const timer = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);

    return () => clearInterval(timer);
  }, [isLocked]);

  // Handle input with useInput hook
  useInput(
    (input, key) => {
      if (isLocked) return;

      // Handle Enter
      if (key.return) {
        if (key.meta) {
          // Alt+Enter or Option+Enter: insert newline
          const before = buffer.slice(0, cursorPos);
          const after = buffer.slice(cursorPos);
          setBuffer(before + "\n" + after);
          setCursorPos(cursorPos + 1);
        } else {
          // Plain Enter: submit
          const message = buffer.trim();
          if (message) {
            onSubmit(message);
            setBuffer("");
            setCursorPos(0);
          }
        }
        return;
      }

      // Handle Escape - check for Alt+Enter sequence (ESC followed by Enter)
      if (key.escape) {
        return;
      }

      // Handle backspace
      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          const before = buffer.slice(0, cursorPos - 1);
          const after = buffer.slice(cursorPos);
          setBuffer(before + after);
          setCursorPos(cursorPos - 1);
        }
        return;
      }

      // Handle arrow keys
      if (key.leftArrow) {
        if (cursorPos > 0) {
          setCursorPos(cursorPos - 1);
        }
        return;
      }

      if (key.rightArrow) {
        if (cursorPos < buffer.length) {
          setCursorPos(cursorPos + 1);
        }
        return;
      }

      if (key.upArrow || key.downArrow) {
        // For now, just ignore up/down in single-line scenarios
        // Multi-line navigation can be added later
        return;
      }

      // Handle Ctrl+U (clear all)
      if (key.ctrl && input === "u") {
        setBuffer("");
        setCursorPos(0);
        return;
      }

      // Handle Ctrl+A (beginning of line)
      if (key.ctrl && input === "a") {
        setCursorPos(0);
        return;
      }

      // Handle Ctrl+E (end of line)
      if (key.ctrl && input === "e") {
        setCursorPos(buffer.length);
        return;
      }

      // Handle Ctrl+K (kill to end)
      if (key.ctrl && input === "k") {
        setBuffer(buffer.slice(0, cursorPos));
        return;
      }

      // Skip if it's a control sequence
      if (key.ctrl || key.meta) {
        return;
      }

      // Check for file picker triggers (@ or /)
      if (input === "@" || input === "/") {
        setFilePickerTrigger(input as "@" | "/");
        setFilePickerQuery("");
        setFilePickerOpen(true);
        return;
      }

      // Regular character input - this is the key fix!
      // The input parameter contains the typed character
      if (input) {
        const before = buffer.slice(0, cursorPos);
        const after = buffer.slice(cursorPos);
        setBuffer(before + input + after);
        setCursorPos(cursorPos + input.length);
      }
    },
    { isActive: !isLocked && !filePickerOpen },
  );

  // File picker handlers
  const handleFileSelect = (path: string): void => {
    // Insert the file reference at cursor position
    const fileRef = `${filePickerTrigger}${path}`;
    const before = buffer.slice(0, cursorPos);
    const after = buffer.slice(cursorPos);
    const newBuffer = before + fileRef + " " + after;
    setBuffer(newBuffer);
    setCursorPos(cursorPos + fileRef.length + 1);
    setFilePickerOpen(false);
    setFilePickerQuery("");
  };

  const handleFilePickerCancel = (): void => {
    setFilePickerOpen(false);
    setFilePickerQuery("");
  };

  // Render
  const lines = buffer.split("\n");
  const isEmpty = buffer.length === 0;

  // Calculate cursor position
  let cursorLine = 0;
  let cursorCol = 0;
  let charCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (charCount + lines[i].length >= cursorPos || i === lines.length - 1) {
      cursorLine = i;
      cursorCol = cursorPos - charCount;
      if (cursorCol > lines[i].length) cursorCol = lines[i].length;
      break;
    }
    charCount += lines[i].length + 1;
  }

  return (
    <Box flexDirection="column">
      {/* File Picker Overlay */}
      {filePickerOpen && (
        <FilePicker
          query={filePickerQuery}
          cwd={process.cwd()}
          filePickerState={filePickerState}
          onSelect={handleFileSelect}
          onCancel={handleFilePickerCancel}
          onQueryChange={setFilePickerQuery}
          isActive={filePickerOpen}
        />
      )}

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={isLocked ? "gray" : filePickerOpen ? "yellow" : "cyan"}
        paddingX={1}
      >
        {isLocked ? (
          <Box gap={1}>
            <BouncingLoader />
            <Text dimColor>esc</Text>
            <Text color="magenta">interrupt</Text>
          </Box>
        ) : isEmpty ? (
          <Box>
            <Text color="cyan">&gt; </Text>
            {cursorVisible ? (
              <Text backgroundColor="cyan" color="gray">
                {placeholder[0]}
              </Text>
            ) : (
              <Text dimColor>{placeholder[0]}</Text>
            )}
            <Text dimColor>{placeholder.slice(1)}</Text>
          </Box>
        ) : (
          lines.map((line, i) => (
            <Box key={i}>
              <Text color="cyan">{i === 0 ? "> " : "│ "}</Text>
              {i === cursorLine ? (
                <Text>
                  {line.slice(0, cursorCol)}
                  {cursorVisible ? (
                    <Text backgroundColor="cyan" color="black">
                      {cursorCol < line.length ? line[cursorCol] : " "}
                    </Text>
                  ) : (
                    <Text>
                      {cursorCol < line.length ? line[cursorCol] : ""}
                    </Text>
                  )}
                  {line.slice(cursorCol + 1)}
                </Text>
              ) : (
                <Text>{line}</Text>
              )}
            </Box>
          ))
        )}

        <Box marginTop={1}>
          <Text dimColor>
            Enter to send • Alt+Enter for newline • @ or / to add files
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
