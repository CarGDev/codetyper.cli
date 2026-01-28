/**
 * Command handler registry - object-based routing
 */

import { handleChat } from "@commands/handlers/chat";
import { handleRun } from "@commands/handlers/run";
import { handleClassify } from "@commands/handlers/classify";
import { handlePlan } from "@commands/handlers/plan";
import { handleValidate } from "@commands/handlers/validate";
import { handleConfig } from "@commands/handlers/config";
import { handleServe } from "@commands/handlers/serve";
import type { CommandRegistry } from "@/types/handlers";

export const COMMAND_REGISTRY: CommandRegistry = {
  chat: handleChat,
  run: handleRun,
  classify: handleClassify,
  plan: handlePlan,
  validate: handleValidate,
  config: handleConfig,
  serve: handleServe,
};

export const isValidCommand = (
  command: string,
): command is keyof CommandRegistry => {
  return command in COMMAND_REGISTRY;
};
