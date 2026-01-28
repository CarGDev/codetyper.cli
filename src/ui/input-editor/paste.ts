/**
 * Paste handling utilities for input editor
 *
 * Handles collapsing large pasted content into placeholders
 * and expanding them when submitting.
 */

import type { InputEditorState, PastedBlock } from "@/types/input-editor";
import { render } from "@ui/input-editor/display";

/** Minimum lines to trigger paste collapsing */
const MIN_LINES_FOR_COLLAPSE = 2;

/** Minimum characters to trigger paste collapsing */
const MIN_CHARS_FOR_COLLAPSE = 80;

/** Time window to consider input as part of same paste (ms) */
const PASTE_TIMEOUT_MS = 30;

/** Time between chars to consider as rapid input (paste) */
const RAPID_INPUT_THRESHOLD_MS = 15;

/**
 * Check if content should be collapsed as a pasted block
 */
export const shouldCollapsePaste = (content: string): boolean => {
  const lineCount = content.split("\n").length;
  return (
    lineCount >= MIN_LINES_FOR_COLLAPSE ||
    content.length >= MIN_CHARS_FOR_COLLAPSE
  );
};

/**
 * Create a placeholder for a pasted block
 */
export const createPastePlaceholder = (
  id: number,
  lineCount: number,
  charCount: number,
): string => {
  if (lineCount > 1) {
    return `[Pasted text #${id} +${lineCount} lines]`;
  }
  return `[Pasted text #${id} ${charCount} chars]`;
};

/**
 * Create and store a pasted block
 */
export const createPastedBlock = (
  state: InputEditorState,
  content: string,
): PastedBlock => {
  state.pasteCounter++;
  const id = state.pasteCounter;
  const lineCount = content.split("\n").length;
  const placeholder = createPastePlaceholder(id, lineCount, content.length);

  const block: PastedBlock = {
    id,
    content,
    lineCount,
    placeholder,
  };

  state.pastedBlocks.set(placeholder, block);
  return block;
};

/**
 * Insert pasted content - collapses if multiline/large
 */
export const insertPastedContent = (
  state: InputEditorState,
  content: string,
): void => {
  const before = state.buffer.slice(0, state.cursorPos);
  const after = state.buffer.slice(state.cursorPos);

  if (shouldCollapsePaste(content)) {
    const block = createPastedBlock(state, content);
    state.buffer = before + block.placeholder + after;
    state.cursorPos += block.placeholder.length;
  } else {
    state.buffer = before + content + after;
    state.cursorPos += content.length;
  }
};

/**
 * Expand all pasted blocks in the buffer
 * Returns the full content with all placeholders replaced
 * Also flushes any pending paste buffer
 */
export const expandPastedBlocks = (state: InputEditorState): string => {
  // First, flush any pending paste buffer synchronously
  if (state.pasteBuffer.length > 0) {
    if (state.pasteFlushTimer) {
      clearTimeout(state.pasteFlushTimer);
      state.pasteFlushTimer = null;
    }
    // Insert paste buffer content directly (already in buffer position)
    const content = state.pasteBuffer;
    state.pasteBuffer = "";
    const before = state.buffer.slice(0, state.cursorPos);
    const after = state.buffer.slice(state.cursorPos);
    state.buffer = before + content + after;
    state.cursorPos += content.length;
  }

  let expanded = state.buffer;

  for (const [placeholder, block] of state.pastedBlocks) {
    expanded = expanded.replace(placeholder, block.content);
  }

  return expanded;
};

/**
 * Delete a pasted block if cursor is at it
 * Returns true if a block was deleted
 */
export const deletePastedBlockAtCursor = (state: InputEditorState): boolean => {
  // Check if cursor is at the end of a pasted block placeholder
  for (const [placeholder, _block] of state.pastedBlocks) {
    const placeholderStart = state.buffer.indexOf(placeholder);
    if (placeholderStart === -1) continue;

    const placeholderEnd = placeholderStart + placeholder.length;

    // Cursor is right after the placeholder (backspace case)
    if (state.cursorPos === placeholderEnd) {
      const before = state.buffer.slice(0, placeholderStart);
      const after = state.buffer.slice(placeholderEnd);
      state.buffer = before + after;
      state.cursorPos = placeholderStart;
      state.pastedBlocks.delete(placeholder);
      return true;
    }

    // Cursor is right at the start of placeholder (delete case)
    if (state.cursorPos === placeholderStart) {
      const before = state.buffer.slice(0, placeholderStart);
      const after = state.buffer.slice(placeholderEnd);
      state.buffer = before + after;
      state.pastedBlocks.delete(placeholder);
      return true;
    }
  }

  return false;
};

/**
 * Check if position is inside a pasted block placeholder
 */
export const isInsidePastedBlock = (
  state: InputEditorState,
  position: number,
): boolean => {
  for (const [placeholder, _block] of state.pastedBlocks) {
    const start = state.buffer.indexOf(placeholder);
    if (start === -1) continue;
    const end = start + placeholder.length;
    if (position > start && position < end) {
      return true;
    }
  }
  return false;
};

/**
 * Get pasted block at position if cursor is at its boundary
 */
export const getPastedBlockAtPosition = (
  state: InputEditorState,
  position: number,
): PastedBlock | null => {
  for (const [placeholder, block] of state.pastedBlocks) {
    const start = state.buffer.indexOf(placeholder);
    if (start === -1) continue;
    const end = start + placeholder.length;
    if (position >= start && position <= end) {
      return block;
    }
  }
  return null;
};

/**
 * Flush the paste buffer - called after paste timeout
 */
const flushPasteBuffer = (state: InputEditorState): void => {
  if (state.pasteBuffer.length === 0) return;

  const content = state.pasteBuffer;
  state.pasteBuffer = "";
  state.pasteFlushTimer = null;

  const before = state.buffer.slice(0, state.cursorPos);
  const after = state.buffer.slice(state.cursorPos);

  if (shouldCollapsePaste(content)) {
    const block = createPastedBlock(state, content);
    state.buffer = before + block.placeholder + after;
    state.cursorPos += block.placeholder.length;
  } else {
    state.buffer = before + content + after;
    state.cursorPos += content.length;
  }

  render(state);
};

/**
 * Check if input timing suggests this is part of a paste
 */
export const isPasteInput = (state: InputEditorState): boolean => {
  if (state.pasteBuffer.length > 0) return true;
  const timeSinceLastPaste = Date.now() - state.lastPasteTime;
  return timeSinceLastPaste < RAPID_INPUT_THRESHOLD_MS;
};

/**
 * Handle raw paste input - buffers characters and flushes after timeout
 * Returns true if the input was handled as paste
 */
export const handlePasteInput = (
  state: InputEditorState,
  char: string,
): boolean => {
  const now = Date.now();

  // Clear existing timer
  if (state.pasteFlushTimer) {
    clearTimeout(state.pasteFlushTimer);
    state.pasteFlushTimer = null;
  }

  // Add to paste buffer
  state.pasteBuffer += char;
  state.lastPasteTime = now;

  // Set timer to flush paste buffer
  state.pasteFlushTimer = setTimeout(() => {
    flushPasteBuffer(state);
  }, PASTE_TIMEOUT_MS);

  return true;
};
