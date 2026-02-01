/**
 * Chat TUI initialization
 */

import { errorMessage, infoMessage } from "@utils/terminal";
import {
  findSession,
  loadSession,
  createSession,
  getMostRecentSession,
} from "@services/session";
import { getConfig } from "@services/config";
import { initializePermissions } from "@services/permissions";
import { getProviderStatus } from "@providers/index";
import { appStore } from "@tui/index";
import { themeActions } from "@stores/theme-store";
import {
  buildBaseContext,
  buildCompletePrompt,
} from "@services/prompt-builder";
import { initSuggestionService } from "@services/command-suggestion-service";
import { addContextFile } from "@services/chat-tui/files";
import type { ProviderName, Message } from "@/types/providers";
import type { ChatSession } from "@/types/index";
import type { ChatTUIOptions } from "@interfaces/ChatTUIOptions";
import type { ChatServiceState } from "@/types/chat-service";
import type { InteractionMode } from "@/types/tui";

const createInitialState = async (
  options: ChatTUIOptions,
  initialMode: InteractionMode = "agent",
): Promise<ChatServiceState> => {
  const config = await getConfig();

  return {
    provider: (options.provider || config.get("provider")) as ProviderName,
    model: options.model || config.get("model") || undefined,
    messages: [],
    contextFiles: new Map(),
    systemPrompt: "",
    currentMode: initialMode,
    verbose: options.verbose || false,
    autoApprove: options.autoApprove || false,
  };
};

const validateProvider = async (state: ChatServiceState): Promise<void> => {
  const status = await getProviderStatus(state.provider);
  if (!status.valid) {
    errorMessage(`Provider ${state.provider} is not configured.`);
    infoMessage(`Run: codetyper login ${state.provider}`);
    process.exit(1);
  }
};

const buildSystemPrompt = async (
  state: ChatServiceState,
  options: ChatTUIOptions,
): Promise<void> => {
  if (options.systemPrompt) {
    state.systemPrompt = options.systemPrompt;
    return;
  }

  const context = await buildBaseContext(state.model);
  const { prompt, rulesPaths } = await buildCompletePrompt(
    state.currentMode,
    context,
    options.appendSystemPrompt,
  );

  state.systemPrompt = prompt;

  if (rulesPaths.length > 0 && state.verbose) {
    infoMessage(`Loaded ${rulesPaths.length} rule file(s):`);
    for (const rulePath of rulesPaths) {
      infoMessage(`  - ${rulePath}`);
    }
  }
};

const restoreMessagesFromSession = (
  state: ChatServiceState,
  session: ChatSession,
): void => {
  state.messages = [{ role: "system", content: state.systemPrompt }];

  for (const msg of session.messages) {
    if (msg.role !== "system") {
      state.messages.push({
        role: msg.role as Message["role"],
        content: msg.content,
      });

      appStore.addLog({
        type: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }
};

const initializeSession = async (
  state: ChatServiceState,
  options: ChatTUIOptions,
): Promise<ChatSession> => {
  if (options.continueSession) {
    const recent = await getMostRecentSession(process.cwd());
    if (recent) {
      await loadSession(recent.id);
      restoreMessagesFromSession(state, recent);
      return recent;
    }
    return createSession("coder");
  }

  if (options.resumeSession) {
    const found = await findSession(options.resumeSession);
    if (found) {
      await loadSession(found.id);
      restoreMessagesFromSession(state, found);
      return found;
    }
    errorMessage(`Session not found: ${options.resumeSession}`);
    process.exit(1);
  }

  return createSession("coder");
};

const addInitialContextFiles = async (
  state: ChatServiceState,
  files?: string[],
): Promise<void> => {
  if (!files) return;

  for (const file of files) {
    await addContextFile(state, file);
  }
};

const initializeTheme = async (): Promise<void> => {
  const config = await getConfig();
  const savedTheme = config.get("theme");
  if (savedTheme) {
    themeActions.setTheme(savedTheme);
  }
};

/**
 * Rebuild system prompt when interaction mode changes
 * Updates both the state and the first message in the conversation
 */
export const rebuildSystemPromptForMode = async (
  state: ChatServiceState,
  newMode: InteractionMode,
  appendPrompt?: string,
): Promise<void> => {
  if (state.currentMode === newMode) {
    return;
  }

  state.currentMode = newMode;

  const context = await buildBaseContext(state.model);
  const { prompt } = await buildCompletePrompt(newMode, context, appendPrompt);

  state.systemPrompt = prompt;

  if (state.messages.length > 0 && state.messages[0].role === "system") {
    state.messages[0].content = prompt;
  }
};

export const initializeChatService = async (
  options: ChatTUIOptions,
): Promise<{ state: ChatServiceState; session: ChatSession }> => {
  const initialMode = appStore.getState().interactionMode;
  const state = await createInitialState(options, initialMode);

  await validateProvider(state);
  await buildSystemPrompt(state, options);
  await initializeTheme();

  const session = await initializeSession(state, options);

  if (state.messages.length === 0) {
    state.messages.push({ role: "system", content: state.systemPrompt });
  }

  await addInitialContextFiles(state, options.files);
  await initializePermissions();
  initSuggestionService(process.cwd());

  return { state, session };
};
