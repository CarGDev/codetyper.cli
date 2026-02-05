/**
 * Chat command handler
 */

import { execute as executeChat } from "@commands/chat";
import type { CommandOptions } from "@/types/common";

export const handleChat = async (options: CommandOptions): Promise<void> => {
  await executeChat(options);
};
