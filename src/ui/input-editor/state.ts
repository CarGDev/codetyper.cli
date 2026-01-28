/**
 * Input editor state management
 */

import { INPUT_EDITOR_DEFAULTS } from "@constants/input-editor";
import type { InputEditorState, KeypressHandler } from "@/types/input-editor";
import type { InputEditorOptions } from "@interfaces/InputEditorOptions";

export const createInitialState = (
  options: InputEditorOptions = {},
): InputEditorState => ({
  buffer: "",
  cursorPos: 0,
  isActive: false,
  isLocked: false,
  prompt: options.prompt || INPUT_EDITOR_DEFAULTS.prompt,
  continuationPrompt:
    options.continuationPrompt || INPUT_EDITOR_DEFAULTS.continuationPrompt,
  keypressHandler: null,
  pastedBlocks: new Map(),
  pasteCounter: 0,
  pasteBuffer: "",
  lastPasteTime: 0,
  pasteFlushTimer: null,
  isBracketedPaste: false,
  bracketedPasteBuffer: "",
});

export const resetBuffer = (state: InputEditorState): void => {
  state.buffer = "";
  state.cursorPos = 0;
  state.pastedBlocks.clear();
  state.pasteCounter = 0;
  state.pasteBuffer = "";
  state.lastPasteTime = 0;
  if (state.pasteFlushTimer) {
    clearTimeout(state.pasteFlushTimer);
    state.pasteFlushTimer = null;
  }
  state.isBracketedPaste = false;
  state.bracketedPasteBuffer = "";
};

export const setKeypressHandler = (
  state: InputEditorState,
  handler: KeypressHandler | null,
): void => {
  state.keypressHandler = handler;
};

export const setActive = (state: InputEditorState, active: boolean): void => {
  state.isActive = active;
};

export const setLocked = (state: InputEditorState, locked: boolean): void => {
  state.isLocked = locked;
};
