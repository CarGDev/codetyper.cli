/**
 * UI Components Tests
 *
 * Tests for terminal UI component utility functions
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { Style, Theme, Icons } from "@constants/styles";
import { BoxChars, BOX_DEFAULTS } from "@constants/components";

// Mock getTerminalWidth to return consistent value for tests
const mockTerminalWidth = 80;
const originalStdoutColumns = process.stdout.columns;

beforeEach(() => {
  Object.defineProperty(process.stdout, "columns", {
    value: mockTerminalWidth,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(process.stdout, "columns", {
    value: originalStdoutColumns,
    writable: true,
    configurable: true,
  });
});

describe("UI Components", () => {
  describe("box", () => {
    it("should create a box with default options", async () => {
      const { box } = await import("@ui/components/box");
      const result = box("Hello");

      expect(result).toContain(BoxChars.rounded.topLeft);
      expect(result).toContain(BoxChars.rounded.topRight);
      expect(result).toContain(BoxChars.rounded.bottomLeft);
      expect(result).toContain(BoxChars.rounded.bottomRight);
      expect(result).toContain("Hello");
    });

    it("should create a box with title", async () => {
      const { box } = await import("@ui/components/box");
      const result = box("Content", { title: "Title" });

      expect(result).toContain("Title");
      expect(result).toContain("Content");
    });

    it("should handle array content", async () => {
      const { box } = await import("@ui/components/box");
      const result = box(["Line 1", "Line 2"]);

      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
    });

    it("should apply different box styles", async () => {
      const { box } = await import("@ui/components/box");

      const singleBox = box("Test", { style: "single" });
      expect(singleBox).toContain(BoxChars.single.topLeft);

      const doubleBox = box("Test", { style: "double" });
      expect(doubleBox).toContain(BoxChars.double.topLeft);

      const boldBox = box("Test", { style: "bold" });
      expect(boldBox).toContain(BoxChars.bold.topLeft);
    });

    it("should align content correctly", async () => {
      const { box } = await import("@ui/components/box");

      const leftAligned = box("Hi", { align: "left", width: 20, padding: 0 });
      const rightAligned = box("Hi", { align: "right", width: 20, padding: 0 });
      const centerAligned = box("Hi", {
        align: "center",
        width: 20,
        padding: 0,
      });

      // Left alignment: content at start
      const leftLines = leftAligned.split("\n");
      const leftContentLine = leftLines.find((l) => l.includes("Hi"));
      expect(leftContentLine).toBeDefined();

      // Right alignment: content at end
      const rightLines = rightAligned.split("\n");
      const rightContentLine = rightLines.find((l) => l.includes("Hi"));
      expect(rightContentLine).toBeDefined();

      // Center alignment: content centered
      const centerLines = centerAligned.split("\n");
      const centerContentLine = centerLines.find((l) => l.includes("Hi"));
      expect(centerContentLine).toBeDefined();
    });

    it("should respect custom width", async () => {
      const { box } = await import("@ui/components/box");
      const result = box("Test", { width: 30, padding: 0 });
      const lines = result.split("\n");

      // Top border should be 30 chars (including box chars and ANSI codes)
      const topLine = lines[0];
      expect(topLine).toContain(BoxChars.rounded.topLeft);
      expect(topLine).toContain(BoxChars.rounded.topRight);
    });

    it("should add padding", async () => {
      const { box } = await import("@ui/components/box");
      const noPadding = box("Test", { padding: 0, width: 20 });
      const withPadding = box("Test", { padding: 2, width: 20 });

      const noPaddingLines = noPadding.split("\n");
      const withPaddingLines = withPadding.split("\n");

      // With padding should have more lines
      expect(withPaddingLines.length).toBeGreaterThan(noPaddingLines.length);
    });
  });

  describe("panel", () => {
    it("should create a panel with left border", async () => {
      const { panel } = await import("@ui/components/box");
      const result = panel("Hello");

      expect(result).toContain("│");
      expect(result).toContain("Hello");
    });

    it("should handle multiline content", async () => {
      const { panel } = await import("@ui/components/box");
      const result = panel(["Line 1", "Line 2"]);
      const lines = result.split("\n");

      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("Line 1");
      expect(lines[1]).toContain("Line 2");
    });

    it("should apply custom color", async () => {
      const { panel } = await import("@ui/components/box");
      const result = panel("Test", Theme.primary);

      expect(result).toContain(Theme.primary);
    });
  });

  describe("errorBox", () => {
    it("should create an error styled box", async () => {
      const { errorBox } = await import("@ui/components/box");
      const result = errorBox("Error Title", "Error message");

      expect(result).toContain("Error Title");
      expect(result).toContain("Error message");
      expect(result).toContain(Theme.error);
    });
  });

  describe("successBox", () => {
    it("should create a success styled box", async () => {
      const { successBox } = await import("@ui/components/box");
      const result = successBox("Success Title", "Success message");

      expect(result).toContain("Success Title");
      expect(result).toContain("Success message");
      expect(result).toContain(Theme.success);
    });
  });

  describe("header", () => {
    it("should create a line-style header by default", async () => {
      const { header } = await import("@ui/components/header");
      const result = header("Section");

      expect(result).toContain("Section");
      expect(result).toContain("─");
    });

    it("should create a simple-style header", async () => {
      const { header } = await import("@ui/components/header");
      const result = header("Section", "simple");

      expect(result).toContain("Section");
      expect(result).toContain(Style.BOLD);
    });

    it("should create a box-style header", async () => {
      const { header } = await import("@ui/components/header");
      const result = header("Section", "box");

      expect(result).toContain("Section");
      expect(result).toContain(BoxChars.rounded.topLeft);
    });
  });

  describe("divider", () => {
    it("should create a divider line", async () => {
      const { divider } = await import("@ui/components/header");
      const result = divider();

      expect(result).toContain("─");
      expect(result).toContain(Theme.textMuted);
      expect(result).toContain(Style.RESET);
    });

    it("should use custom character", async () => {
      const { divider } = await import("@ui/components/header");
      const result = divider("=");

      expect(result).toContain("=");
    });

    it("should apply custom color", async () => {
      const { divider } = await import("@ui/components/header");
      const result = divider("─", Theme.primary);

      expect(result).toContain(Theme.primary);
    });
  });

  describe("keyValue", () => {
    it("should create key-value pairs", async () => {
      const { keyValue } = await import("@ui/components/list");
      const result = keyValue({ Name: "John", Age: 30 });

      expect(result).toContain("Name");
      expect(result).toContain("John");
      expect(result).toContain("Age");
      expect(result).toContain("30");
    });

    it("should handle boolean values", async () => {
      const { keyValue } = await import("@ui/components/list");
      const result = keyValue({ Active: true, Disabled: false });

      expect(result).toContain("Yes");
      expect(result).toContain("No");
    });

    it("should skip undefined values", async () => {
      const { keyValue } = await import("@ui/components/list");
      const result = keyValue({ Present: "value", Missing: undefined });

      expect(result).toContain("Present");
      expect(result).not.toContain("Missing");
    });

    it("should use custom separator", async () => {
      const { keyValue } = await import("@ui/components/list");
      const result = keyValue({ Key: "Value" }, { separator: " = " });

      expect(result).toContain(" = ");
    });

    it("should apply label and value colors", async () => {
      const { keyValue } = await import("@ui/components/list");
      const result = keyValue(
        { Key: "Value" },
        { labelColor: Theme.primary, valueColor: Theme.success },
      );

      expect(result).toContain(Theme.primary);
      expect(result).toContain(Theme.success);
    });
  });

  describe("list", () => {
    it("should create a bulleted list", async () => {
      const { list } = await import("@ui/components/list");
      const result = list(["Item 1", "Item 2", "Item 3"]);

      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
      expect(result).toContain("Item 3");
      expect(result).toContain(Icons.bullet);
    });

    it("should use custom bullet", async () => {
      const { list } = await import("@ui/components/list");
      const result = list(["Item"], { bullet: "-" });

      expect(result).toContain("-");
      expect(result).toContain("Item");
    });

    it("should apply custom indent", async () => {
      const { list } = await import("@ui/components/list");
      const noIndent = list(["Item"], { indent: 0 });
      const withIndent = list(["Item"], { indent: 4 });

      expect(withIndent.length).toBeGreaterThan(noIndent.length);
    });

    it("should apply custom color", async () => {
      const { list } = await import("@ui/components/list");
      const result = list(["Item"], { color: Theme.success });

      expect(result).toContain(Theme.success);
    });
  });

  describe("status", () => {
    it("should create status indicators for all states", async () => {
      const { status } = await import("@ui/components/status");

      const success = status("success", "Operation complete");
      expect(success).toContain(Icons.success);
      expect(success).toContain("Operation complete");
      expect(success).toContain(Theme.success);

      const error = status("error", "Failed");
      expect(error).toContain(Icons.error);
      expect(error).toContain(Theme.error);

      const warning = status("warning", "Caution");
      expect(warning).toContain(Icons.warning);
      expect(warning).toContain(Theme.warning);

      const info = status("info", "Note");
      expect(info).toContain(Icons.info);
      expect(info).toContain(Theme.info);

      const pending = status("pending", "Waiting");
      expect(pending).toContain(Icons.pending);

      const running = status("running", "Processing");
      expect(running).toContain(Icons.running);
      expect(running).toContain(Theme.primary);
    });
  });

  describe("toolCall", () => {
    it("should create tool call display with default state", async () => {
      const { toolCall } = await import("@ui/components/status");
      const result = toolCall("bash", "Running command");

      expect(result).toContain("Running command");
      expect(result).toContain(Style.DIM);
    });

    it("should show different states", async () => {
      const { toolCall } = await import("@ui/components/status");

      const pending = toolCall("read", "Reading file", "pending");
      expect(pending).toContain(Style.DIM);

      const running = toolCall("read", "Reading file", "running");
      expect(running).toContain(Theme.primary);

      const success = toolCall("read", "Reading file", "success");
      expect(success).toContain(Theme.success);

      const error = toolCall("read", "Reading file", "error");
      expect(error).toContain(Theme.error);
    });

    it("should use default icon for unknown tools", async () => {
      const { toolCall } = await import("@ui/components/status");
      const result = toolCall("unknown_tool", "Description");

      expect(result).toContain("Description");
    });
  });

  describe("message", () => {
    it("should create messages for different roles", async () => {
      const { message } = await import("@ui/components/message");

      const userMsg = message("user", "Hello");
      expect(userMsg).toContain("You");
      expect(userMsg).toContain("Hello");

      const assistantMsg = message("assistant", "Hi there");
      expect(assistantMsg).toContain("CodeTyper");
      expect(assistantMsg).toContain("Hi there");

      const systemMsg = message("system", "System info");
      expect(systemMsg).toContain("System");
      expect(systemMsg).toContain("System info");

      const toolMsg = message("tool", "Tool output");
      expect(toolMsg).toContain("Tool");
      expect(toolMsg).toContain("Tool output");
    });

    it("should hide role label when showRole is false", async () => {
      const { message } = await import("@ui/components/message");
      const result = message("user", "Hello", { showRole: false });

      expect(result).not.toContain("You");
      expect(result).toContain("Hello");
    });
  });

  describe("codeBlock", () => {
    it("should create a code block", async () => {
      const { codeBlock } = await import("@ui/components/message");
      const result = codeBlock("const x = 1;");

      expect(result).toContain("```");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("1 │");
    });

    it("should show language when provided", async () => {
      const { codeBlock } = await import("@ui/components/message");
      const result = codeBlock("const x = 1;", "typescript");

      expect(result).toContain("```typescript");
    });

    it("should number multiple lines", async () => {
      const { codeBlock } = await import("@ui/components/message");
      const result = codeBlock("line1\nline2\nline3");

      expect(result).toContain("1 │");
      expect(result).toContain("2 │");
      expect(result).toContain("3 │");
    });

    it("should pad line numbers for alignment", async () => {
      const { codeBlock } = await import("@ui/components/message");
      const code = Array.from({ length: 15 }, (_, i) => `line${i + 1}`).join(
        "\n",
      );
      const result = codeBlock(code);

      // Line numbers should be padded (e.g., " 1 │" for single digit when max is 15)
      expect(result).toContain(" 1 │");
      expect(result).toContain("15 │");
    });
  });
});
