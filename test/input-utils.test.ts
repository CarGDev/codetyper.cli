/**
 * Input Utils Tests
 *
 * Tests for input utility functions including mouse escape sequence filtering
 */

import { describe, it, expect } from "bun:test";
import {
  isMouseEscapeSequence,
  cleanInput,
} from "../src/utils/tui-app/input-utils";

describe("Input Utils", () => {
  describe("isMouseEscapeSequence", () => {
    it("should detect full SGR mouse escape sequence", () => {
      expect(isMouseEscapeSequence("\x1b[<64;45;22M")).toBe(true);
      expect(isMouseEscapeSequence("\x1b[<65;45;22M")).toBe(true);
      expect(isMouseEscapeSequence("\x1b[<0;10;20m")).toBe(true);
    });

    it("should detect full X10 mouse escape sequence", () => {
      expect(isMouseEscapeSequence("\x1b[M !!")).toBe(true);
    });

    it("should detect partial SGR sequence without ESC (Ink behavior)", () => {
      // This is what Ink passes through when ESC is stripped
      expect(isMouseEscapeSequence("[<64;45;22M")).toBe(true);
      expect(isMouseEscapeSequence("[<65;45;22M")).toBe(true);
      expect(isMouseEscapeSequence("[<0;10;20m")).toBe(true);
    });

    it("should detect SGR coordinates without bracket prefix", () => {
      expect(isMouseEscapeSequence("<64;45;22M")).toBe(true);
      expect(isMouseEscapeSequence("<65;45;22M")).toBe(true);
    });

    it("should not detect regular text", () => {
      expect(isMouseEscapeSequence("hello")).toBe(false);
      expect(isMouseEscapeSequence("test123")).toBe(false);
      expect(isMouseEscapeSequence("a")).toBe(false);
    });

    it("should handle empty input", () => {
      expect(isMouseEscapeSequence("")).toBe(false);
    });

    it("should detect multiple sequences in input", () => {
      expect(isMouseEscapeSequence("[<64;45;22M[<65;45;22M")).toBe(true);
    });
  });

  describe("cleanInput", () => {
    it("should remove full SGR mouse escape sequences", () => {
      expect(cleanInput("\x1b[<64;45;22M")).toBe("");
      expect(cleanInput("hello\x1b[<64;45;22Mworld")).toBe("helloworld");
    });

    it("should remove partial SGR sequences (Ink behavior)", () => {
      expect(cleanInput("[<64;45;22M")).toBe("");
      expect(cleanInput("hello[<64;45;22Mworld")).toBe("helloworld");
    });

    it("should remove SGR coordinates without bracket prefix", () => {
      expect(cleanInput("<64;45;22M")).toBe("");
    });

    it("should remove multiple sequences", () => {
      expect(cleanInput("[<64;45;22M[<65;45;22M")).toBe("");
      expect(cleanInput("a[<64;45;22Mb[<65;45;22Mc")).toBe("abc");
    });

    it("should preserve regular text", () => {
      expect(cleanInput("hello world")).toBe("hello world");
      expect(cleanInput("test123")).toBe("test123");
    });

    it("should remove control characters", () => {
      expect(cleanInput("hello\x00world")).toBe("helloworld");
      expect(cleanInput("test\x1fdata")).toBe("testdata");
    });

    it("should handle empty input", () => {
      expect(cleanInput("")).toBe("");
    });
  });
});
