/**
 * Unit tests for paste utility functions
 */

import { describe, expect, it } from "bun:test";
import {
  countLines,
  shouldSummarizePaste,
  generatePlaceholder,
  createPastedContent,
  generatePasteId,
  addPastedBlock,
  updatePastedBlockPositions,
  updatePastedBlocksAfterDelete,
  expandPastedContent,
  normalizeLineEndings,
  clearPastedBlocks,
} from "@utils/tui-app/paste-utils";
import type { PastedContent, PasteState } from "@interfaces/PastedContent";
import { createInitialPasteState } from "@interfaces/PastedContent";

describe("countLines", () => {
  it("should count single line correctly", () => {
    expect(countLines("hello")).toBe(1);
  });

  it("should count multiple lines correctly", () => {
    expect(countLines("line1\nline2\nline3")).toBe(3);
  });

  it("should handle empty string", () => {
    expect(countLines("")).toBe(1);
  });

  it("should handle trailing newline", () => {
    expect(countLines("line1\nline2\n")).toBe(3);
  });
});

describe("shouldSummarizePaste", () => {
  it("should return false for short single line", () => {
    expect(shouldSummarizePaste("hello world")).toBe(false);
  });

  it("should return true for 3+ lines", () => {
    expect(shouldSummarizePaste("line1\nline2\nline3")).toBe(true);
  });

  it("should return true for content over 150 chars", () => {
    const longContent = "a".repeat(151);
    expect(shouldSummarizePaste(longContent)).toBe(true);
  });

  it("should return false for 2 lines under 150 chars", () => {
    expect(shouldSummarizePaste("line1\nline2")).toBe(false);
  });

  it("should return true for exactly 3 lines", () => {
    expect(shouldSummarizePaste("a\nb\nc")).toBe(true);
  });

  it("should return true for exactly 150 chars on single line", () => {
    const content = "a".repeat(150);
    expect(shouldSummarizePaste(content)).toBe(false);
    expect(shouldSummarizePaste(content + "a")).toBe(true);
  });
});

describe("generatePlaceholder", () => {
  it("should generate placeholder with line count", () => {
    expect(generatePlaceholder(5)).toBe("[Pasted ~5 lines]");
  });

  it("should handle single line", () => {
    expect(generatePlaceholder(1)).toBe("[Pasted ~1 lines]");
  });

  it("should handle large line count", () => {
    expect(generatePlaceholder(1000)).toBe("[Pasted ~1000 lines]");
  });
});

describe("createPastedContent", () => {
  it("should create pasted content with correct properties", () => {
    const content = "line1\nline2\nline3";
    const result = createPastedContent("test-id", content, 10);

    expect(result.id).toBe("test-id");
    expect(result.content).toBe(content);
    expect(result.lineCount).toBe(3);
    expect(result.placeholder).toBe("[Pasted ~3 lines]");
    expect(result.startPos).toBe(10);
    expect(result.endPos).toBe(10 + "[Pasted ~3 lines]".length);
  });
});

describe("generatePasteId", () => {
  it("should generate unique ids with counter", () => {
    const id1 = generatePasteId(1);
    const id2 = generatePasteId(2);

    expect(id1).toContain("paste-1-");
    expect(id2).toContain("paste-2-");
    expect(id1).not.toBe(id2);
  });
});

describe("addPastedBlock", () => {
  it("should add block to empty state", () => {
    const state = createInitialPasteState();
    const content = "line1\nline2\nline3";

    const { newState, pastedContent } = addPastedBlock(state, content, 5);

    expect(newState.pasteCounter).toBe(1);
    expect(newState.pastedBlocks.size).toBe(1);
    expect(pastedContent.content).toBe(content);
    expect(pastedContent.startPos).toBe(5);
  });

  it("should add multiple blocks", () => {
    let state = createInitialPasteState();

    const result1 = addPastedBlock(state, "a\nb\nc", 0);
    state = result1.newState;

    const result2 = addPastedBlock(state, "d\ne\nf", 50);
    state = result2.newState;

    expect(state.pasteCounter).toBe(2);
    expect(state.pastedBlocks.size).toBe(2);
  });
});

describe("updatePastedBlockPositions", () => {
  it("should shift blocks after insertion point", () => {
    const blocks = new Map<string, PastedContent>();
    blocks.set("block1", {
      id: "block1",
      content: "test",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 20,
      endPos: 37,
    });

    const updated = updatePastedBlockPositions(blocks, 10, 5);

    const block = updated.get("block1");
    expect(block?.startPos).toBe(25);
    expect(block?.endPos).toBe(42);
  });

  it("should not shift blocks before insertion point", () => {
    const blocks = new Map<string, PastedContent>();
    blocks.set("block1", {
      id: "block1",
      content: "test",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 5,
      endPos: 22,
    });

    const updated = updatePastedBlockPositions(blocks, 30, 5);

    const block = updated.get("block1");
    expect(block?.startPos).toBe(5);
    expect(block?.endPos).toBe(22);
  });
});

describe("updatePastedBlocksAfterDelete", () => {
  it("should shift blocks back when deleting before them", () => {
    const blocks = new Map<string, PastedContent>();
    blocks.set("block1", {
      id: "block1",
      content: "test",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 20,
      endPos: 37,
    });

    const updated = updatePastedBlocksAfterDelete(blocks, 5, 5);

    const block = updated.get("block1");
    expect(block?.startPos).toBe(15);
    expect(block?.endPos).toBe(32);
  });

  it("should remove blocks when deletion contains them", () => {
    const blocks = new Map<string, PastedContent>();
    blocks.set("block1", {
      id: "block1",
      content: "test",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 10,
      endPos: 27,
    });

    const updated = updatePastedBlocksAfterDelete(blocks, 5, 30);

    expect(updated.size).toBe(0);
  });

  it("should not affect blocks after deletion point", () => {
    const blocks = new Map<string, PastedContent>();
    blocks.set("block1", {
      id: "block1",
      content: "test",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 5,
      endPos: 22,
    });

    const updated = updatePastedBlocksAfterDelete(blocks, 25, 5);

    const block = updated.get("block1");
    expect(block?.startPos).toBe(5);
    expect(block?.endPos).toBe(22);
  });
});

describe("expandPastedContent", () => {
  it("should expand single pasted block", () => {
    const blocks = new Map<string, PastedContent>();
    blocks.set("block1", {
      id: "block1",
      content: "expanded content here",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 6,
      endPos: 23,
    });

    const input = "Hello [Pasted ~1 lines] world";
    const result = expandPastedContent(input, blocks);

    expect(result).toBe("Hello expanded content here world");
  });

  it("should expand multiple pasted blocks in correct order", () => {
    const blocks = new Map<string, PastedContent>();
    blocks.set("block1", {
      id: "block1",
      content: "FIRST",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 0,
      endPos: 17,
    });
    blocks.set("block2", {
      id: "block2",
      content: "SECOND",
      lineCount: 1,
      placeholder: "[Pasted ~1 lines]",
      startPos: 18,
      endPos: 35,
    });

    const input = "[Pasted ~1 lines] [Pasted ~1 lines]";
    const result = expandPastedContent(input, blocks);

    expect(result).toBe("FIRST SECOND");
  });

  it("should return input unchanged when no blocks", () => {
    const blocks = new Map<string, PastedContent>();
    const input = "Hello world";

    const result = expandPastedContent(input, blocks);

    expect(result).toBe("Hello world");
  });
});

describe("normalizeLineEndings", () => {
  it("should convert CRLF to LF", () => {
    expect(normalizeLineEndings("line1\r\nline2")).toBe("line1\nline2");
  });

  it("should convert CR to LF", () => {
    expect(normalizeLineEndings("line1\rline2")).toBe("line1\nline2");
  });

  it("should handle mixed line endings", () => {
    expect(normalizeLineEndings("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });

  it("should not change already normalized text", () => {
    expect(normalizeLineEndings("line1\nline2")).toBe("line1\nline2");
  });
});

describe("clearPastedBlocks", () => {
  it("should return empty state", () => {
    const result = clearPastedBlocks();

    expect(result.pastedBlocks.size).toBe(0);
    expect(result.pasteCounter).toBe(0);
  });
});

describe("createInitialPasteState", () => {
  it("should create empty initial state", () => {
    const state = createInitialPasteState();

    expect(state.pastedBlocks.size).toBe(0);
    expect(state.pasteCounter).toBe(0);
  });
});
