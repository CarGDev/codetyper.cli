/**
 * Unit tests for Path Pattern Matcher
 */

import { describe, it, expect } from "bun:test";

import {
  matchesPathPattern,
  matchesFilePattern,
  isFileOpAllowedByIndex,
  findMatchingFilePatterns,
  generateFilePattern,
  normalizePath,
  isPathInDirectory,
} from "@services/permissions/matchers/path";
import { buildPatternIndex } from "@services/permissions/pattern-index";
import type { PermissionPattern } from "@/types/permissions";

describe("Path Pattern Matcher", () => {
  describe("matchesPathPattern", () => {
    it("should match wildcard pattern", () => {
      expect(matchesPathPattern("/any/path/file.ts", "*")).toBe(true);
      expect(matchesPathPattern("relative/file.js", "*")).toBe(true);
    });

    it("should match directory prefix pattern", () => {
      expect(matchesPathPattern("src/file.ts", "src/*")).toBe(true);
      expect(matchesPathPattern("src/nested/file.ts", "src/*")).toBe(true);
      expect(matchesPathPattern("tests/file.ts", "src/*")).toBe(false);
    });

    it("should match extension pattern", () => {
      expect(matchesPathPattern("file.ts", "*.ts")).toBe(true);
      expect(matchesPathPattern("src/nested/file.ts", "*.ts")).toBe(true);
      expect(matchesPathPattern("file.js", "*.ts")).toBe(false);
    });

    it("should match exact path", () => {
      expect(matchesPathPattern("src/file.ts", "src/file.ts")).toBe(true);
      expect(matchesPathPattern("src/other.ts", "src/file.ts")).toBe(false);
    });

    it("should match substring", () => {
      expect(
        matchesPathPattern("/path/to/config/settings.json", "config"),
      ).toBe(true);
    });
  });

  describe("matchesFilePattern", () => {
    it("should match with parsed pattern", () => {
      const pattern: PermissionPattern = {
        tool: "Read",
        path: "*.ts",
      };

      expect(matchesFilePattern("file.ts", pattern)).toBe(true);
      expect(matchesFilePattern("file.js", pattern)).toBe(false);
    });

    it("should return false for pattern without path", () => {
      const pattern: PermissionPattern = {
        tool: "Bash",
        command: "git",
      };

      expect(matchesFilePattern("file.ts", pattern)).toBe(false);
    });
  });

  describe("isFileOpAllowedByIndex", () => {
    it("should check Read operations", () => {
      const index = buildPatternIndex(["Read(*.ts)", "Read(src/*)"]);

      expect(isFileOpAllowedByIndex("Read", "file.ts", index)).toBe(true);
      expect(isFileOpAllowedByIndex("Read", "src/nested.js", index)).toBe(true);
      expect(isFileOpAllowedByIndex("Read", "tests/file.js", index)).toBe(
        false,
      );
    });

    it("should check Write operations separately", () => {
      const index = buildPatternIndex(["Read(*)", "Write(src/*)"]);

      expect(isFileOpAllowedByIndex("Read", "any/file.ts", index)).toBe(true);
      expect(isFileOpAllowedByIndex("Write", "any/file.ts", index)).toBe(false);
      expect(isFileOpAllowedByIndex("Write", "src/file.ts", index)).toBe(true);
    });

    it("should return false for empty index", () => {
      const index = buildPatternIndex([]);

      expect(isFileOpAllowedByIndex("Read", "file.ts", index)).toBe(false);
    });
  });

  describe("findMatchingFilePatterns", () => {
    it("should find all matching patterns", () => {
      const index = buildPatternIndex(["Read(*)", "Read(*.ts)", "Read(src/*)"]);

      const matches = findMatchingFilePatterns("Read", "src/file.ts", index);

      expect(matches.length).toBe(3);
    });

    it("should return empty for no matches", () => {
      const index = buildPatternIndex(["Read(src/*)"]);

      const matches = findMatchingFilePatterns("Read", "tests/file.ts", index);

      expect(matches).toHaveLength(0);
    });
  });

  describe("generateFilePattern", () => {
    it("should generate extension-based pattern for common extensions", () => {
      expect(generateFilePattern("Read", "file.ts")).toBe("Read(*.ts)");
      expect(generateFilePattern("Write", "file.json")).toBe("Write(*.json)");
      expect(generateFilePattern("Edit", "file.tsx")).toBe("Edit(*.tsx)");
    });

    it("should generate directory-based pattern when appropriate", () => {
      expect(generateFilePattern("Read", "src/file.xyz")).toBe("Read(src/*)");
    });

    it("should fall back to basename", () => {
      expect(generateFilePattern("Read", "Makefile")).toBe("Read(Makefile)");
    });
  });

  describe("normalizePath", () => {
    it("should normalize path separators", () => {
      expect(normalizePath("src/file.ts")).toBe("src/file.ts");
      expect(normalizePath("src//file.ts")).toBe("src/file.ts");
      expect(normalizePath("./src/file.ts")).toBe("src/file.ts");
    });
  });

  describe("isPathInDirectory", () => {
    it("should check if path is in directory", () => {
      expect(isPathInDirectory("/project/src/file.ts", "/project/src")).toBe(
        true,
      );
      expect(
        isPathInDirectory("/project/src/nested/file.ts", "/project/src"),
      ).toBe(true);
      expect(isPathInDirectory("/project/tests/file.ts", "/project/src")).toBe(
        false,
      );
    });

    it("should not match partial directory names", () => {
      expect(
        isPathInDirectory("/project/src-backup/file.ts", "/project/src"),
      ).toBe(false);
    });
  });
});
