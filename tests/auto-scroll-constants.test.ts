/**
 * Auto-Scroll Constants Tests
 *
 * Tests for auto-scroll constants
 */

import { describe, it, expect } from "bun:test";
import {
  BOTTOM_THRESHOLD,
  SETTLE_TIMEOUT_MS,
  AUTO_SCROLL_MARK_TIMEOUT_MS,
  KEYBOARD_SCROLL_LINES,
  PAGE_SCROLL_LINES,
  MOUSE_SCROLL_LINES,
} from "../src/constants/auto-scroll";

describe("Auto-Scroll Constants", () => {
  it("should have reasonable bottom threshold", () => {
    expect(BOTTOM_THRESHOLD).toBeGreaterThan(0);
    expect(BOTTOM_THRESHOLD).toBeLessThan(20);
  });

  it("should have reasonable settle timeout", () => {
    expect(SETTLE_TIMEOUT_MS).toBeGreaterThan(100);
    expect(SETTLE_TIMEOUT_MS).toBeLessThan(1000);
  });

  it("should have reasonable auto-scroll mark timeout", () => {
    expect(AUTO_SCROLL_MARK_TIMEOUT_MS).toBeGreaterThan(100);
    expect(AUTO_SCROLL_MARK_TIMEOUT_MS).toBeLessThan(500);
  });

  it("should have reasonable keyboard scroll lines", () => {
    expect(KEYBOARD_SCROLL_LINES).toBeGreaterThan(0);
    expect(KEYBOARD_SCROLL_LINES).toBeLessThan(20);
  });

  it("should have reasonable page scroll lines", () => {
    expect(PAGE_SCROLL_LINES).toBeGreaterThan(KEYBOARD_SCROLL_LINES);
    expect(PAGE_SCROLL_LINES).toBeLessThan(50);
  });

  it("should have reasonable mouse scroll lines", () => {
    expect(MOUSE_SCROLL_LINES).toBeGreaterThan(0);
    expect(MOUSE_SCROLL_LINES).toBeLessThan(10);
  });
});
