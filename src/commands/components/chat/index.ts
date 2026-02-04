import chalk from "chalk";
import { infoMessage, errorMessage, warningMessage } from "@utils/core/terminal";
import {
  createSession,
  loadSession,
  getMostRecentSession,
  findSession,
  setWorkingDirectory,
} from "@services/core/session";
import { getConfig } from "@services/core/config";
import type { Provider as ProviderName, ChatSession } from "@/types/index";
import { getProvider, getProviderStatus } from "@providers/index.ts";
import {
  printWelcome,
  formatTipLine,
  Style,
  Theme,
  createInputEditor,
} from "@ui/index";
import {
  DEFAULT_SYSTEM_PROMPT,
  buildSystemPromptWithRules,
} from "@prompts/index.ts";
import type { ChatOptions } from "@interfaces/ChatOptions.ts";

import { createInitialState, type ChatState } from "./state.ts";
import { restoreMessagesFromSession } from "./session/restore-messages.ts";
import { addContextFile } from "./context/add-context-file.ts";
import { handleCommand } from "./commands/handle-command.ts";
import { handleInput } from "./messages/handle-input.ts";
import { executePrintMode } from "./print-mode.ts";
import { createCleanup } from "./cleanup.ts";

export const execute = async (options: ChatOptions): Promise<void> => {
  const config = await getConfig();
  const state = createInitialState(
    (options.provider || config.get("provider")) as ProviderName,
  );

  state.verbose = options.verbose || false;
  state.autoApprove = options.autoApprove || false;
  state.currentModel = options.model || config.get("model") || "auto";

  const status = await getProviderStatus(state.currentProvider);
  if (!status.valid) {
    errorMessage(`Provider ${state.currentProvider} is not configured.`);
    infoMessage(`Run: codetyper login ${state.currentProvider}`);
    process.exit(1);
  }

  if (options.systemPrompt) {
    state.systemPrompt = options.systemPrompt;
  } else {
    const { prompt: promptWithRules, rulesPaths } =
      await buildSystemPromptWithRules(DEFAULT_SYSTEM_PROMPT, process.cwd());
    state.systemPrompt = promptWithRules;

    if (rulesPaths.length > 0 && state.verbose) {
      infoMessage(`Loaded ${rulesPaths.length} rule file(s):`);
      for (const rulePath of rulesPaths) {
        infoMessage(`  - ${rulePath}`);
      }
    }

    if (options.appendSystemPrompt) {
      state.systemPrompt =
        state.systemPrompt + "\n\n" + options.appendSystemPrompt;
    }
  }

  let session: ChatSession;

  if (options.continueSession) {
    const recent = await getMostRecentSession(process.cwd());
    if (recent) {
      session = recent;
      await loadSession(session.id);
      state.messages = restoreMessagesFromSession(session, state.systemPrompt);
      if (state.verbose) {
        infoMessage(`Continuing session: ${session.id}`);
      }
    } else {
      warningMessage(
        "No previous session found in this directory. Starting new session.",
      );
      session = await createSession("coder");
    }
  } else if (options.resumeSession) {
    const found = await findSession(options.resumeSession);
    if (found) {
      session = found;
      await loadSession(session.id);
      state.messages = restoreMessagesFromSession(session, state.systemPrompt);
      if (state.verbose) {
        infoMessage(`Resumed session: ${session.id}`);
      }
    } else {
      errorMessage(`Session not found: ${options.resumeSession}`);
      process.exit(1);
    }
  } else {
    session = await createSession("coder");
    await setWorkingDirectory(process.cwd());
  }

  if (state.messages.length === 0) {
    state.messages = [{ role: "system", content: state.systemPrompt }];
  }

  if (options.files && options.files.length > 0) {
    for (const file of options.files) {
      await addContextFile(file, state.contextFiles);
    }
  }

  if (options.printMode && options.initialPrompt) {
    await executePrintMode(options.initialPrompt, state);
    return;
  }

  const hasInitialPrompt =
    options.initialPrompt && options.initialPrompt.trim().length > 0;

  const provider = getProvider(state.currentProvider);
  const model = state.currentModel || "auto";

  printWelcome("0.1.0", provider.displayName, model);

  console.log(
    Theme.textMuted +
      "  Session: " +
      Style.RESET +
      chalk.gray(session.id.slice(0, 16) + "..."),
  );
  console.log("");
  console.log(
    Theme.textMuted +
      "  Commands: " +
      Style.RESET +
      chalk.cyan("@file") +
      "  " +
      chalk.cyan("/help") +
      "  " +
      chalk.cyan("/clear") +
      "  " +
      chalk.cyan("/exit"),
  );
  console.log(
    Theme.textMuted +
      "  Input: " +
      Style.RESET +
      chalk.cyan("Enter") +
      " to send, " +
      chalk.cyan("Alt+Enter") +
      " for newline",
  );
  console.log("");
  console.log("  " + formatTipLine());
  console.log("");

  state.inputEditor = createInputEditor({
    prompt: "\x1b[36m> \x1b[0m",
    continuationPrompt: "\x1b[90m│ \x1b[0m",
  });

  state.isRunning = true;

  const cleanup = createCleanup(state);

  const commandHandler = async (command: string, st: ChatState) => {
    await handleCommand(command, st, cleanup);
  };

  state.inputEditor.on("submit", async (input: string) => {
    if (state.isProcessing) return;

    state.isProcessing = true;
    state.inputEditor?.lock();

    try {
      await handleInput(input, state, commandHandler);
    } catch (error) {
      errorMessage(`Error: ${error}`);
    }

    state.isProcessing = false;
    if (state.isRunning && state.inputEditor) {
      state.inputEditor.unlock();
    }
  });

  state.inputEditor.on("interrupt", () => {
    if (state.isProcessing) {
      console.log("\n" + chalk.yellow("Interrupted"));
      state.isProcessing = false;
      state.inputEditor?.unlock();
    } else {
      cleanup();
    }
  });

  state.inputEditor.on("close", () => {
    cleanup();
  });

  state.inputEditor.start();

  if (hasInitialPrompt) {
    state.isProcessing = true;
    state.inputEditor.lock();
    console.log(chalk.cyan("> ") + options.initialPrompt);
    try {
      await handleInput(options.initialPrompt!, state, commandHandler);
    } catch (error) {
      errorMessage(`Error: ${error}`);
    }
    state.isProcessing = false;
    if (state.isRunning && state.inputEditor) {
      state.inputEditor.unlock();
    }
  }
};

export { createInitialState, type ChatState } from "./state.ts";
