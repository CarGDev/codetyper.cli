/**
 * PromptBox Component
 * Bordered input box at the footer with placeholder and help text
 */

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { useThemeColors } from "@tui/hooks/useThemeStore";
import { PLACEHOLDERS } from "@constants/home-screen";

interface PromptBoxProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
}

const getRandomPlaceholder = (): string => {
  return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
};

export const PromptBox: React.FC<PromptBoxProps> = ({
  onSubmit,
  placeholder,
}) => {
  const colors = useThemeColors();
  const [value, setValue] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [randomPlaceholder] = useState(
    () => placeholder ?? getRandomPlaceholder(),
  );

  const handleInput = useCallback(
    (
      input: string,
      key: {
        return?: boolean;
        backspace?: boolean;
        delete?: boolean;
        leftArrow?: boolean;
        rightArrow?: boolean;
        ctrl?: boolean;
      },
    ) => {
      if (key.return) {
        if (value.trim()) {
          onSubmit(value.trim());
          setValue("");
          setCursorPos(0);
        }
        return;
      }

      if (key.backspace) {
        if (cursorPos > 0) {
          setValue(value.slice(0, cursorPos - 1) + value.slice(cursorPos));
          setCursorPos(cursorPos - 1);
        }
        return;
      }

      if (key.delete) {
        if (cursorPos < value.length) {
          setValue(value.slice(0, cursorPos) + value.slice(cursorPos + 1));
        }
        return;
      }

      if (key.leftArrow) {
        setCursorPos(Math.max(0, cursorPos - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPos(Math.min(value.length, cursorPos + 1));
        return;
      }

      // Clear line with Ctrl+U
      if (key.ctrl && input === "u") {
        setValue("");
        setCursorPos(0);
        return;
      }

      if (input && !key.return) {
        setValue(value.slice(0, cursorPos) + input + value.slice(cursorPos));
        setCursorPos(cursorPos + input.length);
      }
    },
    [value, cursorPos, onSubmit],
  );

  useInput(handleInput);

  const isEmpty = value.length === 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={colors.borderFocus}
      paddingX={1}
      width="100%"
    >
      {/* Input line */}
      {isEmpty ? (
        <Box>
          <Text color={colors.primary}>&gt; </Text>
          <Text backgroundColor={colors.bgCursor} color={colors.textDim}>
            T
          </Text>
          <Text dimColor>ype your message...</Text>
        </Box>
      ) : (
        <Box>
          <Text color={colors.primary}>&gt; </Text>
          <Text>
            {value.slice(0, cursorPos)}
            <Text backgroundColor={colors.bgCursor} color="black">
              {cursorPos < value.length ? value[cursorPos] : " "}
            </Text>
            {value.slice(cursorPos + 1)}
          </Text>
        </Box>
      )}

      {/* Help text */}
      <Box marginTop={1}>
        <Text dimColor>
          Enter to send • Alt+Enter for newline • @ to add files
        </Text>
      </Box>
    </Box>
  );
};
