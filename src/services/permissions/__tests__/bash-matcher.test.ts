/**
 * Unit tests for Bash Pattern Matcher
 */

import { describe, it, expect } from "bun:test";

import {
  matchesBashPattern,
  isBashAllowedByIndex,
  findMatchingBashPatterns,
  generateBashPattern,
  extractCommandPrefix,
} from "@services/permissions/matchers/bash";
import { buildPatternIndex } from "@services/permissions/pattern-index";
import type { PermissionPattern } from "@/types/permissions";

describe("Bash Pattern Matcher", () => {
  describe("matchesBashPattern", () => {
    it("should match exact command with wildcard args", () => {
      const pattern: PermissionPattern = {
        tool: "Bash",
        command: "git",
        args: "*",
      };

      expect(matchesBashPattern("git", pattern)).toBe(true);
      expect(matchesBashPattern("git status", pattern)).toBe(true);
      expect(matchesBashPattern("git commit -m 'msg'", pattern)).toBe(true);
    });

    it("should not match different command", () => {
      const pattern: PermissionPattern = {
        tool: "Bash",
        command: "git",
        args: "*",
      };

      expect(matchesBashPattern("npm install", pattern)).toBe(false);
      expect(matchesBashPattern("gitx status", pattern)).toBe(false);
    });

    it("should match command with specific args prefix", () => {
      const pattern: PermissionPattern = {
        tool: "Bash",
        command: "git",
        args: "status*",
      };

      expect(matchesBashPattern("git status", pattern)).toBe(true);
      expect(matchesBashPattern("git status --short", pattern)).toBe(true);
      expect(matchesBashPattern("git commit", pattern)).toBe(false);
    });

    it("should match exact args", () => {
      const pattern: PermissionPattern = {
        tool: "Bash",
        command: "npm",
        args: "install",
      };

      expect(matchesBashPattern("npm install", pattern)).toBe(true);
      expect(matchesBashPattern("npm install lodash", pattern)).toBe(false);
    });

    it("should reject non-Bash patterns", () => {
      const pattern: PermissionPattern = {
        tool: "Read",
        path: "*",
      };

      expect(matchesBashPattern("ls", pattern)).toBe(false);
    });
  });

  describe("isBashAllowedByIndex", () => {
    it("should check against index patterns", () => {
      const index = buildPatternIndex(["Bash(git:*)", "Bash(npm install:*)"]);

      expect(isBashAllowedByIndex("git status", index)).toBe(true);
      expect(isBashAllowedByIndex("git commit", index)).toBe(true);
      expect(isBashAllowedByIndex("npm install lodash", index)).toBe(true);
      expect(isBashAllowedByIndex("npm run build", index)).toBe(false);
      expect(isBashAllowedByIndex("rm -rf /", index)).toBe(false);
    });

    it("should return false for empty index", () => {
      const index = buildPatternIndex([]);

      expect(isBashAllowedByIndex("git status", index)).toBe(false);
    });
  });

  describe("findMatchingBashPatterns", () => {
    it("should find all matching patterns", () => {
      const index = buildPatternIndex([
        "Bash(git:*)",
        "Bash(git status:*)",
        "Bash(npm:*)",
      ]);

      const matches = findMatchingBashPatterns("git status", index);

      expect(matches.length).toBe(2);
      expect(matches.map((m) => m.raw)).toContain("Bash(git:*)");
      expect(matches.map((m) => m.raw)).toContain("Bash(git status:*)");
    });

    it("should return empty for no matches", () => {
      const index = buildPatternIndex(["Bash(git:*)"]);

      const matches = findMatchingBashPatterns("npm install", index);

      expect(matches).toHaveLength(0);
    });
  });

  describe("generateBashPattern", () => {
    it("should generate pattern for multi-word commands", () => {
      expect(generateBashPattern("git status")).toBe("Bash(git status:*)");
      expect(generateBashPattern("npm install lodash")).toBe(
        "Bash(npm install:*)",
      );
      expect(generateBashPattern("docker run nginx")).toBe(
        "Bash(docker run:*)",
      );
    });

    it("should generate pattern for single commands", () => {
      expect(generateBashPattern("ls")).toBe("Bash(ls:*)");
      expect(generateBashPattern("pwd")).toBe("Bash(pwd:*)");
    });

    it("should handle commands with many args", () => {
      expect(generateBashPattern("git commit -m 'message'")).toBe(
        "Bash(git commit:*)",
      );
    });
  });

  describe("extractCommandPrefix", () => {
    it("should extract multi-word prefix", () => {
      expect(extractCommandPrefix("git status")).toBe("git status");
      expect(extractCommandPrefix("npm install lodash")).toBe("npm install");
      expect(extractCommandPrefix("bun test --watch")).toBe("bun test");
    });

    it("should extract single word for non-recognized commands", () => {
      expect(extractCommandPrefix("ls -la")).toBe("ls");
      expect(extractCommandPrefix("cat file.txt")).toBe("cat");
    });
  });
});
