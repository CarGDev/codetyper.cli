/**
 * Input editor types
 */

import type readline from "readline";

export type KeypressHandler = (
  chunk: string | undefined,
  key: readline.Key,
) => void;

/**
 * Represents a pasted text block
 */
export interface PastedBlock {
  id: number;
  content: string;
  lineCount: number;
  placeholder: string;
}

export type InputEditorState = {
  buffer: string;
  cursorPos: number;
  isActive: boolean;
  isLocked: boolean;
  prompt: string;
  continuationPrompt: string;
  keypressHandler: KeypressHandler | null;
  /** Stores pasted blocks with their full content */
  pastedBlocks: Map<string, PastedBlock>;
  /** Counter for pasted block IDs */
  pasteCounter: number;
  /** Buffer for collecting paste input */
  pasteBuffer: string;
  /** Timestamp of last paste input */
  lastPasteTime: number;
  /** Timer for paste flush */
  pasteFlushTimer: ReturnType<typeof setTimeout> | null;
  /** Whether currently in bracketed paste mode */
  isBracketedPaste: boolean;
  /** Buffer for bracketed paste content */
  bracketedPasteBuffer: string;
};

export type InputEditorEvents = {
  submit: (content: string) => void;
  interrupt: () => void;
  close: () => void;
};
