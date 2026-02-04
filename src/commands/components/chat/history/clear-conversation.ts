import { clearMessages } from "@services/core/session";
import { successMessage } from "@utils/core/terminal";
import type { ChatState } from "@commands/components/chat/state";

export const clearConversation = (state: ChatState): void => {
  state.messages = [{ role: "system", content: state.systemPrompt }];
  state.contextFiles.clear();
  clearMessages();
  successMessage("Conversation cleared");
};
