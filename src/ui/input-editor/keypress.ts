/**
 * Keypress handling utilities
 */

import type readline from "readline";
import { ALT_ENTER_SEQUENCES } from "@constants/input-editor";
import type { InputEditorState } from "@/types/input-editor";
import {
  insertText,
  backspace,
  deleteChar,
  moveCursor,
  clearLine,
  killToEnd,
  getLineStart,
  getLineEnd,
} from "@ui/input-editor/cursor";
import { render } from "@ui/input-editor/display";
import {
  handlePasteInput,
  expandPastedBlocks,
  isPasteInput,
  insertPastedContent,
} from "@ui/input-editor/paste";

export type KeypressResult =
  | { type: "submit"; content: string }
  | { type: "interrupt" }
  | { type: "close" }
  | { type: "render" }
  | { type: "none" };

const isAltEnterSequence = (key: readline.Key): boolean =>
  ALT_ENTER_SEQUENCES.includes(
    key.sequence as (typeof ALT_ENTER_SEQUENCES)[number],
  );

const isRegularCharacter = (key: readline.Key): boolean =>
  Boolean(
    key.sequence &&
    key.sequence.length === 1 &&
    key.sequence.charCodeAt(0) >= 32,
  );

type KeyHandler = (
  state: InputEditorState,
  key: readline.Key,
  char?: string,
) => KeypressResult;

const KEY_HANDLERS: Record<string, KeyHandler> = {
  // Ctrl+C - interrupt
  "ctrl+c": () => ({ type: "interrupt" }),

  // Ctrl+D - close if buffer empty
  "ctrl+d": (state) =>
    state.buffer.length === 0 ? { type: "close" } : { type: "none" },

  // Enter with meta (Alt+Enter) - insert newline
  "meta+return": (state) => {
    insertText(state, "\n");
    return { type: "render" };
  },
  "meta+enter": (state) => {
    insertText(state, "\n");
    return { type: "render" };
  },

  // Plain Enter - submit (expand pasted blocks)
  return: (state) => ({
    type: "submit",
    content: expandPastedBlocks(state).trim(),
  }),
  enter: (state) => ({
    type: "submit",
    content: expandPastedBlocks(state).trim(),
  }),

  // Backspace
  backspace: (state) => {
    backspace(state);
    return { type: "render" };
  },

  // Delete
  delete: (state) => {
    deleteChar(state);
    return { type: "render" };
  },

  // Arrow keys
  left: (state) => {
    moveCursor(state, -1);
    return { type: "render" };
  },
  right: (state) => {
    moveCursor(state, 1);
    return { type: "render" };
  },

  // Home / Ctrl+A
  home: (state) => {
    state.cursorPos = getLineStart(state);
    return { type: "render" };
  },
  "ctrl+a": (state) => {
    state.cursorPos = getLineStart(state);
    return { type: "render" };
  },

  // End / Ctrl+E
  end: (state) => {
    state.cursorPos = getLineEnd(state);
    return { type: "render" };
  },
  "ctrl+e": (state) => {
    state.cursorPos = getLineEnd(state);
    return { type: "render" };
  },

  // Ctrl+U - clear line
  "ctrl+u": (state) => {
    clearLine(state);
    return { type: "render" };
  },

  // Ctrl+K - kill to end
  "ctrl+k": (state) => {
    killToEnd(state);
    return { type: "render" };
  },
};

const getKeyName = (key: readline.Key): string => {
  const parts: string[] = [];
  if (key.ctrl) parts.push("ctrl");
  if (key.meta) parts.push("meta");
  if (key.name) parts.push(key.name);
  return parts.join("+");
};

/**
 * Handle bracketed paste content - called from editor when paste ends
 */
export const handleBracketedPaste = (
  state: InputEditorState,
): KeypressResult => {
  if (state.bracketedPasteBuffer.length === 0) {
    return { type: "none" };
  }

  const content = state.bracketedPasteBuffer;
  state.bracketedPasteBuffer = "";

  // Insert the pasted content (will be collapsed if large)
  insertPastedContent(state, content);
  return { type: "render" };
};

/**
 * Handle a keypress event
 * Note: Bracketed paste is handled by raw data handler in editor.ts
 */
export const handleKeypress = (
  state: InputEditorState,
  chunk: string | undefined,
  key: readline.Key,
): KeypressResult => {
  const char = chunk || key?.sequence;

  // If in bracketed paste mode, skip - raw handler is collecting paste
  if (state.isBracketedPaste) {
    return { type: "none" };
  }

  // No key info - raw input (paste without brackets)
  // OR multi-character input (definitely paste)
  if (!key || (char && char.length > 1)) {
    if (char) {
      // Buffer paste input and flush after timeout
      handlePasteInput(state, char);
      // Don't render immediately - paste handler will render after flush
      return { type: "none" };
    }
    return { type: "none" };
  }

  // Check for Alt+Enter escape sequences
  if (isAltEnterSequence(key)) {
    insertText(state, "\n");
    return { type: "render" };
  }

  // Check handlers
  const keyName = getKeyName(key);
  const handler = KEY_HANDLERS[keyName];
  if (handler) {
    return handler(state, key, char);
  }

  // Skip control sequences and special keys
  if (key.ctrl || key.meta) {
    return { type: "none" };
  }

  // Skip special keys that don't produce characters
  const skipKeys = ["escape", "tab", "up", "down"];
  if (key.name && skipKeys.includes(key.name)) {
    return { type: "none" };
  }

  // Handle regular character input
  if (isRegularCharacter(key) && key.sequence) {
    // If we're in paste mode (buffering or rapid input), treat as paste
    if (isPasteInput(state)) {
      handlePasteInput(state, key.sequence);
      return { type: "none" };
    }

    insertText(state, key.sequence);
    return { type: "render" };
  }

  return { type: "none" };
};

/**
 * Process keypress result
 */
export const processKeypressResult = (
  state: InputEditorState,
  result: KeypressResult,
  callbacks: {
    onSubmit: (content: string) => void;
    onInterrupt: () => void;
    onClose: () => void;
  },
): void => {
  const handlers: Record<KeypressResult["type"], () => void> = {
    submit: () => {
      const content = (result as { type: "submit"; content: string }).content;
      callbacks.onSubmit(content);
    },
    interrupt: callbacks.onInterrupt,
    close: callbacks.onClose,
    render: () => render(state),
    none: () => {},
  };

  handlers[result.type]();
};
