/**
 * Display rendering utilities for input editor
 */

import { ANSI, PASTE_STYLE } from "@constants/input-editor";
import type { InputEditorState } from "@/types/input-editor";

/**
 * Style pasted block placeholders in text
 */
const stylePastedBlocks = (text: string, state: InputEditorState): string => {
  let result = text;
  for (const [placeholder] of state.pastedBlocks) {
    result = result.replace(
      placeholder,
      `${PASTE_STYLE.start}${placeholder}${PASTE_STYLE.end}`,
    );
  }
  return result;
};

/**
 * Clear the current display
 */
export const clearDisplay = (state: InputEditorState): void => {
  const lines = state.buffer.split("\n");
  const lineCount = lines.length;

  // Move cursor to start of first line
  if (lineCount > 1) {
    process.stdout.write(ANSI.moveUp(lineCount - 1));
  }
  process.stdout.write(ANSI.carriageReturn);

  // Clear all lines
  for (let i = 0; i < lineCount; i++) {
    process.stdout.write(ANSI.clearLine);
    if (i < lineCount - 1) {
      process.stdout.write(ANSI.moveDown(1));
    }
  }

  // Move back to first line
  if (lineCount > 1) {
    process.stdout.write(ANSI.moveUp(lineCount - 1));
  }
  process.stdout.write(ANSI.carriageReturn);
};

/**
 * Calculate cursor position in terms of line and column
 */
const calculateCursorPosition = (
  state: InputEditorState,
  lines: string[],
): { cursorLine: number; cursorCol: number } => {
  let charCount = 0;
  let cursorLine = 0;
  let cursorCol = 0;

  for (let i = 0; i < lines.length; i++) {
    if (
      charCount + lines[i].length >= state.cursorPos ||
      i === lines.length - 1
    ) {
      cursorLine = i;
      cursorCol = state.cursorPos - charCount;
      break;
    }
    charCount += lines[i].length + 1; // +1 for newline
  }

  return { cursorLine, cursorCol };
};

/**
 * Render the input buffer with visual feedback
 */
export const render = (state: InputEditorState): void => {
  clearDisplay(state);

  const lines = state.buffer.split("\n");
  const { cursorLine, cursorCol } = calculateCursorPosition(state, lines);

  // Render each line with styled pasted blocks
  for (let i = 0; i < lines.length; i++) {
    const prefix = i === 0 ? state.prompt : state.continuationPrompt;
    const styledLine = stylePastedBlocks(lines[i], state);
    process.stdout.write(prefix + styledLine);
    if (i < lines.length - 1) {
      process.stdout.write("\n");
    }
  }

  // Position cursor correctly
  const linesToMoveUp = lines.length - 1 - cursorLine;
  if (linesToMoveUp > 0) {
    process.stdout.write(ANSI.moveUp(linesToMoveUp));
  }

  // Move to start of line and then to cursor column
  process.stdout.write(ANSI.carriageReturn);
  const prefixLength = 2; // Both prompts are 2 visible chars
  process.stdout.write(ANSI.moveRight(prefixLength + cursorCol));
};

/**
 * Show submitted input
 */
export const showSubmitted = (state: InputEditorState): void => {
  clearDisplay(state);

  const lines = state.buffer.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      process.stdout.write(state.prompt + lines[i] + "\n");
    } else {
      process.stdout.write(state.continuationPrompt + lines[i] + "\n");
    }
  }
};
