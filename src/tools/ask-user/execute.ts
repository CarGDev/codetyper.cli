/**
 * Ask User Tool
 *
 * Presents a question with selectable options to the user via TUI modal.
 * The agent blocks until the user selects an option or types a custom answer.
 */

import { z } from "zod";

import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";
import type { QuestionResponse } from "@/types/tui";

const ASK_USER_DESCRIPTION =
  "Ask the user a question with selectable options. Use when you need user input to decide between approaches, confirm decisions, or gather preferences. The user sees buttons they can click/select.";

const optionSchema = z.object({
  label: z.string().describe("Short label for the option (shown as button)"),
  description: z
    .string()
    .optional()
    .describe("Optional longer description shown below the label"),
});

export const askUserParams = z.object({
  question: z
    .string()
    .describe("The question to ask the user (shown as header)"),
  options: z
    .array(optionSchema)
    .min(2)
    .max(10)
    .describe("Options for the user to choose from (2-10 options)"),
  allow_custom: z
    .boolean()
    .optional()
    .default(false)
    .describe("Allow the user to type a custom answer instead of selecting"),
});

type AskUserParams = z.infer<typeof askUserParams>;

/**
 * Global handler set by the TUI service to bridge tool → modal
 */
let questionHandler:
  | ((
      question: string,
      options: { label: string; description?: string }[],
      allowCustom: boolean,
    ) => Promise<QuestionResponse>)
  | null = null;

export const setQuestionHandler = (
  handler: typeof questionHandler,
): void => {
  questionHandler = handler;
};

const executeAskUser = async (
  args: AskUserParams,
  _ctx: ToolContext,
): Promise<ToolResult> => {
  if (!questionHandler) {
    return {
      success: false,
      title: "Question",
      output: "",
      error:
        "Question handler not available. This tool requires TUI mode.",
    };
  }

  const response = await questionHandler(
    args.question,
    args.options,
    args.allow_custom ?? false,
  );

  const answer = response.customAnswer
    ? response.customAnswer
    : response.selectedLabels.join(", ");

  return {
    success: true,
    title: "User Response",
    output: `Question: ${args.question}\nUser selected: ${answer}`,
    metadata: {
      question: args.question,
      selectedLabels: response.selectedLabels,
      customAnswer: response.customAnswer,
    },
  };
};

export const askUserTool: ToolDefinition<typeof askUserParams> = {
  name: "ask_user",
  description: ASK_USER_DESCRIPTION,
  parameters: askUserParams,
  execute: executeAskUser,
};
