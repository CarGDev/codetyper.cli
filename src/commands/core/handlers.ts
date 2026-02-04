/**
 * Command handlers - Route commands to appropriate implementations
 */

import { errorMessage } from "@utils/core/terminal";
import { COMMAND_REGISTRY, isValidCommand } from "@commands/handlers/registry";
import type { CommandOptions } from "@/types/index";

export const handleCommand = async (
  command: string,
  options: CommandOptions,
): Promise<void> => {
  try {
    if (!isValidCommand(command)) {
      errorMessage(`Unknown command: ${command}`);
      process.exit(1);
    }

    const handler = COMMAND_REGISTRY[command];
    await handler(options);
  } catch (error) {
    errorMessage(`Command failed: ${error}`);
    throw error;
  }
};
