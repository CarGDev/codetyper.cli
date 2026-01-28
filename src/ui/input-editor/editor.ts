/**
 * Input editor factory - functional implementation
 */

import { EventEmitter } from "events";
import readline from "readline";
import type { InputEditorState } from "@/types/input-editor";
import type { InputEditorOptions } from "@interfaces/InputEditorOptions";
import {
  createInitialState,
  resetBuffer,
  setActive,
  setLocked,
} from "@ui/input-editor/state";
import { render, showSubmitted, clearDisplay } from "@ui/input-editor/display";
import {
  handleKeypress,
  processKeypressResult,
  handleBracketedPaste,
} from "@ui/input-editor/keypress";

export type InputEditorInstance = EventEmitter & {
  start: () => void;
  stop: () => void;
  lock: () => void;
  unlock: () => void;
  showPrompt: () => void;
};

/** Bracketed paste mode escape sequences */
const BRACKETED_PASTE_ENABLE = "\x1b[?2004h";
const BRACKETED_PASTE_DISABLE = "\x1b[?2004l";
const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

const enableRawMode = (): void => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    // Enable bracketed paste mode
    process.stdout.write(BRACKETED_PASTE_ENABLE);
  }
  process.stdin.resume();
};

const disableRawMode = (): void => {
  if (process.stdin.isTTY) {
    // Disable bracketed paste mode
    process.stdout.write(BRACKETED_PASTE_DISABLE);
    process.stdin.setRawMode(false);
  }
};

/**
 * Create an input editor instance
 */
export const createInputEditorInstance = (
  options: InputEditorOptions = {},
): InputEditorInstance => {
  const emitter = new EventEmitter() as InputEditorInstance;
  const state: InputEditorState = createInitialState(options);
  let dataHandler: ((data: Buffer) => void) | null = null;

  const processResult = (result: ReturnType<typeof handleKeypress>): void => {
    processKeypressResult(state, result, {
      onSubmit: (content: string) => {
        clearDisplay(state);
        showSubmitted(state);
        resetBuffer(state);

        if (content) {
          emitter.emit("submit", content);
        } else {
          render(state);
        }
      },
      onInterrupt: () => emitter.emit("interrupt"),
      onClose: () => emitter.emit("close"),
    });
  };

  const keypressHandler = (
    chunk: string | undefined,
    key: readline.Key,
  ): void => {
    if (!state.isActive || state.isLocked) return;
    // Skip if we're in bracketed paste mode - raw handler takes over
    if (state.isBracketedPaste) return;

    const result = handleKeypress(state, chunk, key);
    processResult(result);
  };

  /**
   * Raw data handler to intercept bracketed paste sequences
   * before readline processes them
   */
  const rawDataHandler = (data: Buffer): void => {
    if (!state.isActive || state.isLocked) return;

    const str = data.toString("utf-8");

    // Check for paste start
    if (str.includes(PASTE_START)) {
      state.isBracketedPaste = true;
      state.bracketedPasteBuffer = "";

      // Extract content after paste start
      const startIdx = str.indexOf(PASTE_START);
      let content = str.slice(startIdx + PASTE_START.length);

      // Check if paste end is in the same chunk
      const endIdx = content.indexOf(PASTE_END);
      if (endIdx >= 0) {
        // Complete paste in one chunk
        state.bracketedPasteBuffer = content.slice(0, endIdx);
        state.isBracketedPaste = false;
        const result = handleBracketedPaste(state);
        processResult(result);
      } else {
        // Paste continues
        state.bracketedPasteBuffer = content;
      }
      return;
    }

    // Check for paste end
    if (state.isBracketedPaste && str.includes(PASTE_END)) {
      const endIdx = str.indexOf(PASTE_END);
      state.bracketedPasteBuffer += str.slice(0, endIdx);
      state.isBracketedPaste = false;
      const result = handleBracketedPaste(state);
      processResult(result);
      return;
    }

    // If in bracketed paste, accumulate content
    if (state.isBracketedPaste) {
      state.bracketedPasteBuffer += str;
      return;
    }

    // Not paste-related - let keypress handler deal with it
  };

  const start = (): void => {
    if (state.isActive) return;
    setActive(state, true);
    resetBuffer(state);

    enableRawMode();

    // Add raw data handler BEFORE readline to catch paste sequences
    dataHandler = rawDataHandler;
    process.stdin.on("data", dataHandler);

    readline.emitKeypressEvents(process.stdin);
    render(state);

    state.keypressHandler = keypressHandler;
    process.stdin.on("keypress", keypressHandler);
  };

  const stop = (): void => {
    if (!state.isActive) return;
    setActive(state, false);

    if (state.keypressHandler) {
      process.stdin.removeListener("keypress", state.keypressHandler);
      state.keypressHandler = null;
    }

    if (dataHandler) {
      process.stdin.removeListener("data", dataHandler);
      dataHandler = null;
    }

    disableRawMode();
  };

  const lock = (): void => {
    setLocked(state, true);
    disableRawMode();

    if (state.keypressHandler) {
      process.stdin.removeListener("keypress", state.keypressHandler);
    }
    if (dataHandler) {
      process.stdin.removeListener("data", dataHandler);
    }
  };

  const unlock = (): void => {
    setLocked(state, false);
    resetBuffer(state);
    enableRawMode();

    if (dataHandler) {
      process.stdin.on("data", dataHandler);
    }
    if (state.keypressHandler) {
      process.stdin.on("keypress", state.keypressHandler);
    }
    render(state);
  };

  const showPrompt = (): void => {
    resetBuffer(state);
    render(state);
  };

  emitter.start = start;
  emitter.stop = stop;
  emitter.lock = lock;
  emitter.unlock = unlock;
  emitter.showPrompt = showPrompt;

  return emitter;
};

/**
 * Create and manage input editor instance
 */
export const createInputEditor = (
  options?: InputEditorOptions,
): InputEditorInstance => createInputEditorInstance(options);

// Backward compatibility - class-like interface
export const InputEditor = {
  create: createInputEditorInstance,
};
