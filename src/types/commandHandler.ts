import { CommandContext } from "@interfaces/commandContext";

export type CommandHandler = (ctx: CommandContext) => Promise<void> | void;
