/**
 * Question handler for ask_user tool
 *
 * Bridges the ask_user tool to the TUI question modal.
 * Same blocking-promise pattern as permission-handler.
 */

import { v4 as uuidv4 } from "uuid";

import { setQuestionHandler } from "@tools/ask-user/execute";
import type { QuestionResponse } from "@/types/tui";
import { appStore } from "@tui-solid/context/app";

export const setupQuestionHandler = (): void => {
  setQuestionHandler(
    (
      question: string,
      options: { label: string; description?: string }[],
      allowCustom: boolean,
    ): Promise<QuestionResponse> => {
      return new Promise((resolve) => {
        appStore.setMode("question_prompt");

        appStore.setQuestionPrompt({
          id: uuidv4(),
          question,
          options,
          allowCustom,
          resolve: (response) => {
            appStore.setQuestionPrompt(null);
            appStore.setMode("tool_execution");
            resolve(response);
          },
        });
      });
    },
  );
};

export const cleanupQuestionHandler = (): void => {
  setQuestionHandler(null);
};
