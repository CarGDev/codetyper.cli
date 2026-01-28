import { processFileReferences } from "@commands/components/chat/context/process-file-references";
import { sendMessage } from "@commands/components/chat/messages/send-message";
import type { ChatState } from "@commands/components/chat/state";

export const handleInput = async (
  input: string,
  state: ChatState,
  handleCommand: (command: string, state: ChatState) => Promise<void>,
): Promise<void> => {
  if (input.startsWith("/")) {
    await handleCommand(input, state);
    return;
  }

  const processedInput = await processFileReferences(input, state.contextFiles);
  await sendMessage(processedInput, state);
};
