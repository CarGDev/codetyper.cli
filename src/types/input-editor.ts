import type readline from "readline";

export type KeypressHandler = (
  chunk: string | undefined,
  key: readline.Key,
) => void;

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
  pastedBlocks: Map<string, PastedBlock>;
  pasteCounter: number;
  pasteBuffer: string;
  lastPasteTime: number;
  pasteFlushTimer: ReturnType<typeof setTimeout> | null;
  isBracketedPaste: boolean;
  bracketedPasteBuffer: string;
};

export type InputEditorEvents = {
  submit: (content: string) => void;
  interrupt: () => void;
  close: () => void;
};
