/**
 * Chat TUI command handling
 */

import { saveSession as saveSessionSession } from "@services/core/session";
import { appStore } from "@tui/index";
import { CHAT_MESSAGES, type CommandName } from "@constants/chat-service";
import { handleLogin, handleLogout, showWhoami } from "@services/chat-tui/auth";
import {
  handleRememberCommand,
  handleLearningsCommand,
} from "@services/chat-tui/learnings";
import { showUsageStats } from "@services/chat-tui/usage";
import {
  checkOllamaAvailability,
  checkCopilotAvailability,
} from "@services/cascading-provider";
import { getOverallScore } from "@services/provider-quality";
import { PROVIDER_IDS } from "@constants/provider-quality";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
} from "@/types/chat-service";

type CommandHandler = (
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
) => Promise<void> | void;

const showHelp: CommandHandler = () => {
  appStore.setMode("help_menu");
};

const clearConversation: CommandHandler = (state, callbacks) => {
  state.messages = [{ role: "system", content: state.systemPrompt }];
  appStore.clearLogs();
  callbacks.onLog("system", CHAT_MESSAGES.CONVERSATION_CLEARED);
};

const saveSession: CommandHandler = async (_, callbacks) => {
  await saveSessionSession();
  callbacks.onLog("system", CHAT_MESSAGES.SESSION_SAVED);
};

const showContext: CommandHandler = (state, callbacks) => {
  const tokenEstimate = state.messages.reduce(
    (sum, msg) => sum + Math.ceil(msg.content.length / 4),
    0,
  );
  callbacks.onLog(
    "system",
    `Context: ${state.messages.length} messages, ~${tokenEstimate} tokens`,
  );
};

const selectModel: CommandHandler = () => {
  appStore.setMode("model_select");
};

const selectProvider: CommandHandler = () => {
  appStore.setMode("provider_select");
};

const showStatus: CommandHandler = async (state, callbacks) => {
  const ollamaStatus = await checkOllamaAvailability();
  const copilotStatus = await checkCopilotAvailability();
  const ollamaScore = await getOverallScore(PROVIDER_IDS.OLLAMA);
  const { cascadeEnabled } = appStore.getState();

  const lines = [
    "═══ Provider Status ═══",
    "",
    `Current Provider: ${state.provider}`,
    `Cascade Mode: ${cascadeEnabled ? "Enabled" : "Disabled"}`,
    "",
    "Ollama:",
    `  Status: ${ollamaStatus.available ? "● Available" : "○ Not Available"}`,
    ollamaStatus.error ? `  Error: ${ollamaStatus.error}` : null,
    `  Quality Score: ${Math.round(ollamaScore * 100)}%`,
    "",
    "Copilot:",
    `  Status: ${copilotStatus.available ? "● Available" : "○ Not Available"}`,
    copilotStatus.error ? `  Error: ${copilotStatus.error}` : null,
    "",
    "Commands:",
    "  /provider - Select provider",
    "  /login    - Authenticate with Copilot",
    "",
    "Config: ~/.config/codetyper/config.json",
  ].filter(Boolean);

  callbacks.onLog("system", lines.join("\n"));
};

const selectAgent: CommandHandler = () => {
  appStore.setMode("agent_select");
};

const selectTheme: CommandHandler = () => {
  appStore.setMode("theme_select");
};

const selectMCP: CommandHandler = () => {
  appStore.setMode("mcp_select");
};

const selectMode: CommandHandler = () => {
  appStore.setMode("mode_select");
};

const toggleDebugLogs: CommandHandler = (_, callbacks) => {
  appStore.toggleDebugLog();
  const { debugLogVisible } = appStore.getState();
  callbacks.onLog(
    "system",
    `Debug logs panel ${debugLogVisible ? "enabled" : "disabled"}`,
  );
};

const COMMAND_HANDLERS: Record<CommandName, CommandHandler> = {
  help: showHelp,
  h: showHelp,
  clear: clearConversation,
  c: clearConversation,
  save: saveSession,
  s: saveSession,
  context: showContext,
  usage: (state, callbacks) => showUsageStats(state, callbacks),
  u: (state, callbacks) => showUsageStats(state, callbacks),
  model: selectModel,
  models: selectModel,
  agent: selectAgent,
  a: selectAgent,
  theme: selectTheme,
  mcp: selectMCP,
  mode: selectMode,
  whoami: showWhoami,
  login: handleLogin,
  logout: handleLogout,
  provider: selectProvider,
  p: selectProvider,
  status: showStatus,
  remember: handleRememberCommand,
  learnings: (_, callbacks) => handleLearningsCommand(callbacks),
  logs: toggleDebugLogs,
};

export const executeCommand = async (
  state: ChatServiceState,
  command: string,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const normalizedCommand = command.toLowerCase() as CommandName;
  const handler = COMMAND_HANDLERS[normalizedCommand];

  if (handler) {
    await handler(state, callbacks);
  } else {
    callbacks.onLog("error", CHAT_MESSAGES.UNKNOWN_COMMAND(command));
  }
};
