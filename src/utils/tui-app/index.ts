/**
 * TUI App Utilities - Exports
 */

export {
  isMouseEscapeSequence,
  cleanInput,
  insertAtCursor,
  deleteBeforeCursor,
  calculateCursorPosition,
} from "@utils/tui-app/input-utils";

export {
  isInputLocked,
  isModalCommand,
  isMainInputActive,
  isProcessing,
} from "@utils/tui-app/mode-utils";

export {
  countLines,
  shouldSummarizePaste,
  generatePlaceholder,
  createPastedContent,
  generatePasteId,
  addPastedBlock,
  updatePastedBlockPositions,
  updatePastedBlocksAfterDelete,
  expandPastedContent,
  getDisplayBuffer,
  normalizeLineEndings,
  clearPastedBlocks,
} from "@utils/tui-app/paste-utils";
