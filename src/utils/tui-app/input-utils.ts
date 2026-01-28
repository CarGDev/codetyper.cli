/**
 * TUI App Input Utilities
 *
 * Helper functions for input handling in the TUI App
 */

// Mouse escape sequence patterns for filtering
// Note: Patterns for replacement use 'g' flag, patterns for testing don't
const MOUSE_PATTERNS = {
  // Full escape sequences (for replacement)
  SGR_FULL: /\x1b\[<\d+;\d+;\d+[Mm]/g,
  X10_FULL: /\x1b\[M[\x20-\xff]{3}/g,
  // Partial sequences (when ESC is stripped by Ink) - for replacement
  SGR_PARTIAL: /\[<\d+;\d+;\d+[Mm]/g,
  // Just the coordinates part - for replacement
  SGR_COORDS_ONLY: /<\d+;\d+;\d+[Mm]/g,
  // Check patterns (no 'g' flag to avoid stateful matching)
  SGR_PARTIAL_CHECK: /\[<\d+;\d+;\d+[Mm]/,
  SGR_COORDS_CHECK: /^\d+;\d+;\d+[Mm]/,
  // String prefixes
  SGR_PREFIX: "\x1b[<",
  X10_PREFIX: "\x1b[M",
  BRACKET_SGR_PREFIX: "[<",
} as const;

// Control character patterns for cleaning input
const CONTROL_PATTERNS = {
  CONTROL_CHARS: /[\x00-\x1f\x7f]/g,
  ESCAPE_SEQUENCES: /\x1b\[.*?[a-zA-Z]/g,
} as const;

/**
 * Check if input is a mouse escape sequence
 * Handles both full sequences and partial sequences where ESC was stripped
 */
export const isMouseEscapeSequence = (input: string): boolean => {
  if (!input) return false;

  // Check for full SGR or X10 prefixes
  if (
    input.includes(MOUSE_PATTERNS.SGR_PREFIX) ||
    input.includes(MOUSE_PATTERNS.X10_PREFIX)
  ) {
    return true;
  }

  // Check for partial SGR sequence (when ESC is stripped): [<64;45;22M
  if (input.includes(MOUSE_PATTERNS.BRACKET_SGR_PREFIX)) {
    if (MOUSE_PATTERNS.SGR_PARTIAL_CHECK.test(input)) {
      return true;
    }
  }

  // Check for SGR coordinate pattern without prefix: <64;45;22M
  if (
    input.startsWith("<") &&
    MOUSE_PATTERNS.SGR_COORDS_CHECK.test(input.slice(1))
  ) {
    return true;
  }

  // Check for just coordinates: 64;45;22M (unlikely but possible)
  if (MOUSE_PATTERNS.SGR_COORDS_CHECK.test(input)) {
    return true;
  }

  return false;
};

/**
 * Clean input by removing control characters, escape sequences, and mouse sequences
 */
export const cleanInput = (input: string): string => {
  return (
    input
      // Remove full mouse escape sequences
      .replace(MOUSE_PATTERNS.SGR_FULL, "")
      .replace(MOUSE_PATTERNS.X10_FULL, "")
      // Remove partial mouse sequences (when ESC is stripped)
      .replace(MOUSE_PATTERNS.SGR_PARTIAL, "")
      .replace(MOUSE_PATTERNS.SGR_COORDS_ONLY, "")
      // Remove control characters and other escape sequences
      .replace(CONTROL_PATTERNS.CONTROL_CHARS, "")
      .replace(CONTROL_PATTERNS.ESCAPE_SEQUENCES, "")
  );
};

/**
 * Insert text at cursor position in buffer
 */
export const insertAtCursor = (
  buffer: string,
  cursorPos: number,
  text: string,
): { newBuffer: string; newCursorPos: number } => {
  const before = buffer.slice(0, cursorPos);
  const after = buffer.slice(cursorPos);
  return {
    newBuffer: before + text + after,
    newCursorPos: cursorPos + text.length,
  };
};

/**
 * Delete character before cursor
 */
export const deleteBeforeCursor = (
  buffer: string,
  cursorPos: number,
): { newBuffer: string; newCursorPos: number } => {
  if (cursorPos <= 0) {
    return { newBuffer: buffer, newCursorPos: cursorPos };
  }
  const before = buffer.slice(0, cursorPos - 1);
  const after = buffer.slice(cursorPos);
  return {
    newBuffer: before + after,
    newCursorPos: cursorPos - 1,
  };
};

/**
 * Calculate cursor line and column from buffer position
 */
export const calculateCursorPosition = (
  buffer: string,
  cursorPos: number,
): { line: number; col: number } => {
  const lines = buffer.split("\n");
  let charCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (charCount + lines[i].length >= cursorPos || i === lines.length - 1) {
      let col = cursorPos - charCount;
      if (col > lines[i].length) col = lines[i].length;
      return { line: i, col };
    }
    charCount += lines[i].length + 1;
  }

  return { line: 0, col: 0 };
};
