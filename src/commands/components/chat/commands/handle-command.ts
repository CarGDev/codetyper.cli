import { warningMessage, infoMessage } from "@utils/core/terminal";
import type { ChatState } from "@commands/components/chat/state";
import COMMAND_REGISTRY from "@commands/components/chat/commands/commandsRegistry";

const isValidCommand = (cmd: string): boolean => {
  return COMMAND_REGISTRY.has(cmd);
};

export const handleCommand = async (
  command: string,
  state: ChatState,
  cleanup: () => void,
): Promise<void> => {
  const parts = command.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (!isValidCommand(cmd)) {
    warningMessage(`Unknown command: /${cmd}`);
    infoMessage("Type /help for available commands");
    return;
  }

  const handler = COMMAND_REGISTRY.get(cmd);
  if (handler) {
    await handler({ state, args, cleanup });
  }
};
