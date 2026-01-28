/**
 * Learning Modal Component - Prompts user to save a learning
 */

import React from "react";
import { Box, Text } from "ink";
import { useAppStore } from "@tui/store";
import { SelectMenu } from "@tui/components/SelectMenu";
import type { SelectOption, LearningScope } from "@/types/tui";
import {
  LEARNING_OPTIONS,
  LEARNING_CONTENT_MAX_LENGTH,
  LEARNING_TRUNCATION_SUFFIX,
} from "@constants/tui-components";

const truncateContent = (content: string): string => {
  if (content.length <= LEARNING_CONTENT_MAX_LENGTH) {
    return content;
  }
  const truncateAt =
    LEARNING_CONTENT_MAX_LENGTH - LEARNING_TRUNCATION_SUFFIX.length;
  return content.slice(0, truncateAt) + LEARNING_TRUNCATION_SUFFIX;
};

export function LearningModal(): React.ReactElement | null {
  const learningPrompt = useAppStore((state) => state.learningPrompt);

  if (!learningPrompt) return null;

  const handleSelect = (option: SelectOption): void => {
    learningPrompt.resolve({
      save: option.value !== "skip",
      scope:
        option.value === "skip" ? undefined : (option.value as LearningScope),
    });
  };

  const displayContent = truncateContent(learningPrompt.content);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Box marginBottom={1}>
        <Text color="magenta" bold>
          Remember this?
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color="cyan">{displayContent}</Text>
        {learningPrompt.context && (
          <Text dimColor>({learningPrompt.context})</Text>
        )}
      </Box>

      <SelectMenu
        options={LEARNING_OPTIONS}
        onSelect={handleSelect}
        isActive={!!learningPrompt}
      />

      <Box marginTop={1}>
        <Text dimColor>
          Learnings help codetyper understand your project preferences.
        </Text>
      </Box>
    </Box>
  );
}
