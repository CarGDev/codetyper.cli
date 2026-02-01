/**
 * Utility functions for paste virtual text handling
 */

import type { PastedContent, PasteState } from "@interfaces/PastedContent";
import {
  PASTE_LINE_THRESHOLD,
  PASTE_CHAR_THRESHOLD,
  PASTE_PLACEHOLDER_FORMAT,
} from "@constants/paste";

/**
 * Counts the number of lines in a string
 */
export const countLines = (text: string): number => {
  return (text.match(/\n/g)?.length ?? 0) + 1;
};

/**
 * Determines if pasted content should be summarized as virtual text
 */
export const shouldSummarizePaste = (content: string): boolean => {
  const lineCount = countLines(content);
  return (
    lineCount >= PASTE_LINE_THRESHOLD || content.length > PASTE_CHAR_THRESHOLD
  );
};

/**
 * Generates a placeholder string for pasted content
 */
export const generatePlaceholder = (lineCount: number): string => {
  return PASTE_PLACEHOLDER_FORMAT.replace("{lineCount}", String(lineCount));
};

/**
 * Creates a new pasted content entry
 */
export const createPastedContent = (
  id: string,
  content: string,
  startPos: number,
): PastedContent => {
  const lineCount = countLines(content);
  const placeholder = generatePlaceholder(lineCount);
  return {
    id,
    content,
    lineCount,
    placeholder,
    startPos,
    endPos: startPos + placeholder.length,
  };
};

/**
 * Generates a unique ID for a pasted block
 */
export const generatePasteId = (counter: number): string => {
  return `paste-${counter}-${Date.now()}`;
};

/**
 * Adds a new pasted block to the state
 */
export const addPastedBlock = (
  state: PasteState,
  content: string,
  startPos: number,
): { newState: PasteState; pastedContent: PastedContent } => {
  const newCounter = state.pasteCounter + 1;
  const id = generatePasteId(newCounter);
  const pastedContent = createPastedContent(id, content, startPos);

  const newBlocks = new Map(state.pastedBlocks);
  newBlocks.set(id, pastedContent);

  return {
    newState: {
      pastedBlocks: newBlocks,
      pasteCounter: newCounter,
      pastedImages: state.pastedImages ?? [],
    },
    pastedContent,
  };
};

/**
 * Updates positions of pasted blocks after text insertion
 */
export const updatePastedBlockPositions = (
  blocks: Map<string, PastedContent>,
  insertPos: number,
  insertLength: number,
): Map<string, PastedContent> => {
  const updatedBlocks = new Map<string, PastedContent>();

  for (const [id, block] of blocks) {
    if (block.startPos >= insertPos) {
      // Block is after insertion point - shift positions
      updatedBlocks.set(id, {
        ...block,
        startPos: block.startPos + insertLength,
        endPos: block.endPos + insertLength,
      });
    } else if (block.endPos <= insertPos) {
      // Block is before insertion point - no change
      updatedBlocks.set(id, block);
    } else {
      // Insertion is within the block - this shouldn't happen with virtual text
      // but keep the block unchanged as a fallback
      updatedBlocks.set(id, block);
    }
  }

  return updatedBlocks;
};

/**
 * Updates positions of pasted blocks after text deletion
 */
export const updatePastedBlocksAfterDelete = (
  blocks: Map<string, PastedContent>,
  deletePos: number,
  deleteLength: number,
): Map<string, PastedContent> => {
  const updatedBlocks = new Map<string, PastedContent>();

  for (const [id, block] of blocks) {
    // Check if deletion affects this block
    const deleteEnd = deletePos + deleteLength;

    if (deleteEnd <= block.startPos) {
      // Deletion is completely before this block - shift positions back
      updatedBlocks.set(id, {
        ...block,
        startPos: block.startPos - deleteLength,
        endPos: block.endPos - deleteLength,
      });
    } else if (deletePos >= block.endPos) {
      // Deletion is completely after this block - no change
      updatedBlocks.set(id, block);
    } else if (deletePos <= block.startPos && deleteEnd >= block.endPos) {
      // Deletion completely contains this block - remove it
      // Don't add to updatedBlocks
    } else {
      // Partial overlap - this is complex, for now just remove the block
      // A more sophisticated implementation could adjust boundaries
      // Don't add to updatedBlocks
    }
  }

  return updatedBlocks;
};

/**
 * Expands all pasted blocks in the input buffer
 * Used before submitting the message
 */
export const expandPastedContent = (
  inputBuffer: string,
  pastedBlocks: Map<string, PastedContent>,
): string => {
  if (pastedBlocks.size === 0) {
    return inputBuffer;
  }

  // Sort blocks by position in reverse order to avoid position shifts
  const sortedBlocks = Array.from(pastedBlocks.values()).sort(
    (a, b) => b.startPos - a.startPos,
  );

  let result = inputBuffer;

  for (const block of sortedBlocks) {
    const before = result.slice(0, block.startPos);
    const after = result.slice(block.endPos);
    result = before + block.content + after;
  }

  return result;
};

/**
 * Gets the display text for the input buffer
 * This returns the buffer as-is since placeholders are already in the buffer
 */
export const getDisplayBuffer = (
  inputBuffer: string,
  _pastedBlocks: Map<string, PastedContent>,
): string => {
  // The placeholders are already stored in the buffer
  // This function is here for future enhancements like styling
  return inputBuffer;
};

/**
 * Cleans carriage returns and normalizes line endings
 */
export const normalizeLineEndings = (text: string): string => {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
};

/**
 * Clears all pasted blocks and images
 */
export const clearPastedBlocks = (): PasteState => ({
  pastedBlocks: new Map(),
  pasteCounter: 0,
  pastedImages: [],
});
