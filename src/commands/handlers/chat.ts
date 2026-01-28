/**
 * Chat command handler
 */

import { execute as executeChat } from "@commands/chat";
import type { CommandOptions } from "@/types/index";

export const handleChat = async (options: CommandOptions): Promise<void> => {
  await executeChat(options);
};
