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
import { projectConfig } from "@services/project-config";
import { getProviderStatus } from "@providers/index";
import { appStore } from "@tui/index";
import { themeActions } from "@stores/theme-store";
import {
  AGENTIC_SYSTEM_PROMPT,
  buildAgenticPrompt,
  buildSystemPromptWithRules,
} from "@prompts/index";
import { initSuggestionService } from "@services/command-suggestion-service";
import { addContextFile } from "@services/chat-tui/files";
import type { ProviderName, Message } from "@/types/providers";
import type { ChatSession } from "@/types/index";
import type { ChatTUIOptions } from "@interfaces/ChatTUIOptions";
import type { ChatServiceState } from "@/types/chat-service";

const createInitialState = async (
  options: ChatTUIOptions,
): Promise<ChatServiceState> => {
  const config = await getConfig();

  return {
    provider: (options.provider || config.get("provider")) as ProviderName,
    model: options.model || config.get("model") || undefined,
    messages: [],
    contextFiles: new Map(),
    systemPrompt: AGENTIC_SYSTEM_PROMPT,
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

const getGitContext = async (): Promise<{
  isGitRepo: boolean;
  branch?: string;
  status?: string;
  recentCommits?: string[];
}> => {
  try {
    const { execSync } = await import("child_process");
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    const status = execSync("git status --short", { encoding: "utf-8" }).trim() || "(clean)";
    const commits = execSync("git log --oneline -5", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    return { isGitRepo: true, branch, status, recentCommits: commits };
  } catch {
    return { isGitRepo: false };
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

  // Build agentic prompt with environment context
  const gitContext = await getGitContext();
  const basePrompt = buildAgenticPrompt({
    workingDir: process.cwd(),
    isGitRepo: gitContext.isGitRepo,
    platform: process.platform,
    today: new Date().toISOString().split("T")[0],
    model: state.model,
    gitBranch: gitContext.branch,
    gitStatus: gitContext.status,
    recentCommits: gitContext.recentCommits,
  });

  // Add project rules
  const { prompt: promptWithRules, rulesPaths } =
    await buildSystemPromptWithRules(basePrompt, process.cwd());
  state.systemPrompt = promptWithRules;

  if (rulesPaths.length > 0 && state.verbose) {
    infoMessage(`Loaded ${rulesPaths.length} rule file(s):`);
    for (const rulePath of rulesPaths) {
      infoMessage(`  - ${rulePath}`);
    }
  }

  const learningsContext = await projectConfig.buildLearningsContext();
  if (learningsContext) {
    state.systemPrompt = state.systemPrompt + "\n\n" + learningsContext;
    if (state.verbose) {
      infoMessage("Loaded project learnings");
    }
  }

  if (options.appendSystemPrompt) {
    state.systemPrompt =
      state.systemPrompt + "\n\n" + options.appendSystemPrompt;
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

export const initializeChatService = async (
  options: ChatTUIOptions,
): Promise<{ state: ChatServiceState; session: ChatSession }> => {
  const state = await createInitialState(options);

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
