/**
 * Cursor manipulation utilities
 */

import type { InputEditorState } from "@/types/input-editor";
import {
  deletePastedBlockAtCursor,
  isInsidePastedBlock,
  getPastedBlockAtPosition,
} from "@ui/input-editor/paste";

/**
 * Get start of current line
 */
export const getLineStart = (state: InputEditorState): number => {
  const beforeCursor = state.buffer.slice(0, state.cursorPos);
  const lastNewline = beforeCursor.lastIndexOf("\n");
  return lastNewline === -1 ? 0 : lastNewline + 1;
};

/**
 * Get end of current line
 */
export const getLineEnd = (state: InputEditorState): number => {
  const afterCursor = state.buffer.slice(state.cursorPos);
  const nextNewline = afterCursor.indexOf("\n");
  return nextNewline === -1
    ? state.buffer.length
    : state.cursorPos + nextNewline;
};

/**
 * Insert text at cursor position
 */
export const insertText = (state: InputEditorState, text: string): void => {
  const before = state.buffer.slice(0, state.cursorPos);
  const after = state.buffer.slice(state.cursorPos);
  state.buffer = before + text + after;
  state.cursorPos += text.length;
};

/**
 * Delete character before cursor (backspace)
 * Deletes pasted blocks as a single unit
 */
export const backspace = (state: InputEditorState): boolean => {
  if (state.cursorPos > 0) {
    // Check if we're at the end of a pasted block - delete whole block
    if (deletePastedBlockAtCursor(state)) {
      return true;
    }

    // Check if inside a pasted block placeholder - skip to start
    const block = getPastedBlockAtPosition(state, state.cursorPos - 1);
    if (block) {
      const placeholderStart = state.buffer.indexOf(block.placeholder);
      if (placeholderStart !== -1) {
        const before = state.buffer.slice(0, placeholderStart);
        const after = state.buffer.slice(
          placeholderStart + block.placeholder.length,
        );
        state.buffer = before + after;
        state.cursorPos = placeholderStart;
        state.pastedBlocks.delete(block.placeholder);
        return true;
      }
    }

    const before = state.buffer.slice(0, state.cursorPos - 1);
    const after = state.buffer.slice(state.cursorPos);
    state.buffer = before + after;
    state.cursorPos--;
    return true;
  }
  return false;
};

/**
 * Delete character at cursor
 * Deletes pasted blocks as a single unit
 */
export const deleteChar = (state: InputEditorState): boolean => {
  if (state.cursorPos < state.buffer.length) {
    // Check if we're at the start of a pasted block - delete whole block
    if (deletePastedBlockAtCursor(state)) {
      return true;
    }

    // Check if cursor is at or inside a pasted block placeholder
    const block = getPastedBlockAtPosition(state, state.cursorPos);
    if (block) {
      const placeholderStart = state.buffer.indexOf(block.placeholder);
      if (placeholderStart !== -1) {
        const before = state.buffer.slice(0, placeholderStart);
        const after = state.buffer.slice(
          placeholderStart + block.placeholder.length,
        );
        state.buffer = before + after;
        state.cursorPos = placeholderStart;
        state.pastedBlocks.delete(block.placeholder);
        return true;
      }
    }

    const before = state.buffer.slice(0, state.cursorPos);
    const after = state.buffer.slice(state.cursorPos + 1);
    state.buffer = before + after;
    return true;
  }
  return false;
};

/**
 * Move cursor by delta
 * Skips over pasted block placeholders as a single unit
 */
export const moveCursor = (state: InputEditorState, delta: number): boolean => {
  let newPos = state.cursorPos + delta;

  if (newPos < 0 || newPos > state.buffer.length) {
    return false;
  }

  // Check if we're entering a pasted block placeholder - skip over it
  if (isInsidePastedBlock(state, newPos)) {
    const block = getPastedBlockAtPosition(state, newPos);
    if (block) {
      const placeholderStart = state.buffer.indexOf(block.placeholder);
      if (placeholderStart !== -1) {
        // If moving right, go to end of placeholder
        // If moving left, go to start of placeholder
        newPos =
          delta > 0
            ? placeholderStart + block.placeholder.length
            : placeholderStart;
      }
    }
  }

  if (newPos >= 0 && newPos <= state.buffer.length) {
    state.cursorPos = newPos;
    return true;
  }
  return false;
};

/**
 * Clear line (Ctrl+U)
 */
export const clearLine = (state: InputEditorState): void => {
  state.buffer = "";
  state.cursorPos = 0;
};

/**
 * Kill to end of line (Ctrl+K)
 */
export const killToEnd = (state: InputEditorState): void => {
  state.buffer = state.buffer.slice(0, state.cursorPos);
};
