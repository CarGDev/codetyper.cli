import { processFileReferences } from "@commands/components/chat/context/process-file-references";
import { sendMessage } from "@commands/components/chat/messages/send-message";
import type { ChatState } from "@commands/components/chat/state";

export const handleInput = async (
  input: string,
  state: ChatState,
  handleCommand: (command: string, state: ChatState) => Promise<void>,
): Promise<void> => {
  // Only treat as a slash-command when it looks like one (e.g. /help, /model-gpt4)
  // This prevents pasting/debugging content that starts with "/" from invoking command parsing.
  const slashCommandMatch = input.match(/^\/([\w-]+)(?:\s|$)/);
  if (slashCommandMatch) {
    await handleCommand(input, state);
    return;
  }

  const processedInput = await processFileReferences(input, state.contextFiles);
  await sendMessage(processedInput, state);
};
