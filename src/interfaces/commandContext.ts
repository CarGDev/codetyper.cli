import type { ChatState } from "@commands/components/chat/state";

export interface CommandContext {
  state: ChatState;
  args: string[];
  cleanup: () => void;
}
