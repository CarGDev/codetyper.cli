import type { ChatSession } from "@/types/index";
import type { Message } from "@providers/index.ts";

export const restoreMessagesFromSession = (
  session: ChatSession,
  systemPrompt: string,
): Message[] => {
  const messages: Message[] = [{ role: "system", content: systemPrompt }];

  for (const msg of session.messages) {
    if (msg.role !== "system") {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  return messages;
};
