/**
 * Interface for tracking pasted content with virtual text
 */

import type { PastedImage } from "@/types/image";

export interface PastedContent {
  /** Unique identifier for the pasted block */
  id: string;
  /** The actual pasted content */
  content: string;
  /** Number of lines in the pasted content */
  lineCount: number;
  /** The placeholder text displayed in the input */
  placeholder: string;
  /** Start position in the input buffer */
  startPos: number;
  /** End position in the input buffer (exclusive) */
  endPos: number;
}

export interface PasteState {
  /** Map of pasted blocks by their ID */
  pastedBlocks: Map<string, PastedContent>;
  /** Counter for generating unique IDs */
  pasteCounter: number;
  /** List of pasted images */
  pastedImages: PastedImage[];
}

export const createInitialPasteState = (): PasteState => ({
  pastedBlocks: new Map(),
  pasteCounter: 0,
  pastedImages: [],
});
