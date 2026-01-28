import { successMessage, infoMessage } from "@utils/terminal";
import type { ChatState } from "@commands/components/chat/state";

export const compactHistory = (state: ChatState): void => {
  if (state.messages.length <= 11) {
    infoMessage("History is already compact");
    return;
  }

  const systemPrompt = state.messages[0];
  const recentMessages = state.messages.slice(-10);
  state.messages = [systemPrompt, ...recentMessages];

  successMessage(`Compacted to ${state.messages.length - 1} messages`);
};
