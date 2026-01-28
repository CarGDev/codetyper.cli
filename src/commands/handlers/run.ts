/**
 * Run command handler
 */

import { execute } from "@commands/runner";
import type { CommandOptions } from "@/types/index";

export const handleRun = async (options: CommandOptions): Promise<void> => {
  await execute(options);
};
