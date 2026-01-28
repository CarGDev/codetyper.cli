import { saveSession } from "@services/session";
import { showHelp } from "@commands/components/chat/commands/show-help";
import { clearConversation } from "@commands/components/chat/history/clear-conversation";
import { showContextFiles } from "@commands/components/chat/context/show-context-files";
import { removeFile } from "@commands/components/chat/context/remove-file";
import { showContext } from "@commands/components/chat/history/show-context";
import { compactHistory } from "@commands/components/chat/history/compact-history";
import { showHistory } from "@commands/components/chat/history/show-history";
import { showModels } from "@commands/components/chat/models/show-models";
import { showProviders } from "@commands/components/chat/models/show-providers";
import { switchProvider } from "@commands/components/chat/models/switch-provider";
import { switchModel } from "@commands/components/chat/models/switch-model";
import { showSessionInfo } from "@commands/components/chat/session/show-session-info";
import { listSessions } from "@commands/components/chat/session/list-sessions";
import { showUsage } from "@commands/components/chat/usage/show-usage";
import { showAgents } from "@commands/components/chat/agents/show-agents";
import { switchAgent } from "@commands/components/chat/agents/switch-agent";
import { handleMCP } from "@commands/components/chat/mcp/handle-mcp";
import { CommandContext } from "@interfaces/commandContext";
import type { CommandHandler } from "@/types/commandHandler";
import { successMessage } from "@utils/terminal";

const COMMAND_REGISTRY: Map<string, CommandHandler> = new Map<
  string,
  CommandHandler
>([
  ["help", () => showHelp()],
  ["h", () => showHelp()],
  ["clear", (ctx: CommandContext) => clearConversation(ctx.state)],
  ["c", (ctx: CommandContext) => clearConversation(ctx.state)],
  ["files", (ctx: CommandContext) => showContextFiles(ctx.state.contextFiles)],
  ["f", (ctx: CommandContext) => showContextFiles(ctx.state.contextFiles)],
  ["exit", (ctx: CommandContext) => ctx.cleanup()],
  ["quit", (ctx: CommandContext) => ctx.cleanup()],
  ["q", (ctx: CommandContext) => ctx.cleanup()],
  [
    "save",
    async () => {
      await saveSession();
      successMessage("Session saved");
    },
  ],
  [
    "s",
    async () => {
      await saveSession();
      successMessage("Session saved");
    },
  ],
  [
    "models",
    async (ctx: CommandContext) =>
      showModels(ctx.state.currentProvider, ctx.state.currentModel),
  ],
  [
    "m",
    async (ctx: CommandContext) =>
      showModels(ctx.state.currentProvider, ctx.state.currentModel),
  ],
  ["providers", async () => showProviders()],
  ["p", async () => showProviders()],
  [
    "provider",
    async (ctx: CommandContext) =>
      switchProvider(ctx.args.join(" "), ctx.state),
  ],
  [
    "model",
    async (ctx: CommandContext) => switchModel(ctx.args.join(" "), ctx.state),
  ],
  ["context", (ctx: CommandContext) => showContext(ctx.state)],
  ["compact", (ctx: CommandContext) => compactHistory(ctx.state)],
  ["history", (ctx: CommandContext) => showHistory(ctx.state)],
  [
    "remove",
    (ctx: CommandContext) =>
      removeFile(ctx.args.join(" "), ctx.state.contextFiles),
  ],
  [
    "rm",
    (ctx: CommandContext) =>
      removeFile(ctx.args.join(" "), ctx.state.contextFiles),
  ],
  ["session", async () => showSessionInfo()],
  ["sessions", async () => listSessions()],
  ["usage", async (ctx: CommandContext) => showUsage(ctx.state)],
  ["u", async (ctx: CommandContext) => showUsage(ctx.state)],
  [
    "agent",
    async (ctx: CommandContext) => {
      if (ctx.args.length === 0) {
        await showAgents(ctx.state);
      } else {
        await switchAgent(ctx.args.join(" "), ctx.state);
      }
    },
  ],
  [
    "a",
    async (ctx: CommandContext) => {
      if (ctx.args.length === 0) {
        await showAgents(ctx.state);
      } else {
        await switchAgent(ctx.args.join(" "), ctx.state);
      }
    },
  ],
  ["mcp", async (ctx: CommandContext) => handleMCP(ctx.args)],
]);

export default COMMAND_REGISTRY;
