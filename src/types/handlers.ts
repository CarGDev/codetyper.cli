/**
 * Handler types for command routing
 */

import type { CommandOptions } from "@/types/index";

export type CommandName =
  | "chat"
  | "run"
  | "classify"
  | "plan"
  | "validate"
  | "config"
  | "serve";

export type CommandHandler = (options: CommandOptions) => Promise<void>;

export type CommandRegistry = Record<CommandName, CommandHandler>;

export type ConfigAction = "show" | "path" | "set";

export type ConfigKey = "provider" | "model" | "maxIterations" | "timeout";
