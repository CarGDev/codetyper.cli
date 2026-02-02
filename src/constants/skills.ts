/**
 * Skill System Constants
 *
 * Constants for skill loading, matching, and execution.
 */

import { join } from "path";
import { DIRS } from "@constants/paths";

/**
 * Skill file configuration
 */
export const SKILL_FILE = {
  NAME: "SKILL.md",
  FRONTMATTER_DELIMITER: "---",
  ENCODING: "utf-8",
} as const;

/**
 * Skill directories
 */
export const SKILL_DIRS = {
  BUILTIN: join(__dirname, "..", "skills"),
  USER: join(DIRS.config, "skills"),
  PROJECT: ".codetyper/skills",
} as const;

/**
 * Skill loading configuration
 */
export const SKILL_LOADING = {
  CACHE_TTL_MS: 60000,
  MAX_SKILLS: 100,
  MAX_FILE_SIZE_BYTES: 100000,
} as const;

/**
 * Skill matching configuration
 */
export const SKILL_MATCHING = {
  MIN_CONFIDENCE: 0.7,
  EXACT_MATCH_BONUS: 0.3,
  COMMAND_PREFIX: "/",
  FUZZY_THRESHOLD: 0.6,
} as const;

/**
 * Default skill metadata values
 */
export const SKILL_DEFAULTS = {
  VERSION: "1.0.0",
  TRIGGER_TYPE: "command" as const,
  AUTO_TRIGGER: false,
  REQUIRED_TOOLS: [] as string[],
} as const;

/**
 * Skill error messages
 */
export const SKILL_ERRORS = {
  NOT_FOUND: (id: string) => `Skill not found: ${id}`,
  INVALID_FRONTMATTER: (file: string) => `Invalid frontmatter in: ${file}`,
  MISSING_REQUIRED_FIELD: (field: string, file: string) =>
    `Missing required field '${field}' in: ${file}`,
  LOAD_FAILED: (file: string, error: string) =>
    `Failed to load skill from ${file}: ${error}`,
  NO_MATCH: "No matching skill found for input",
  EXECUTION_FAILED: (id: string, error: string) =>
    `Skill execution failed for ${id}: ${error}`,
} as const;

/**
 * Skill titles for UI
 */
export const SKILL_TITLES = {
  LOADING: (name: string) => `Loading skill: ${name}`,
  EXECUTING: (name: string) => `Executing skill: ${name}`,
  MATCHED: (name: string, confidence: number) =>
    `Matched skill: ${name} (${(confidence * 100).toFixed(0)}%)`,
  COMPLETED: (name: string) => `Skill completed: ${name}`,
  FAILED: (name: string) => `Skill failed: ${name}`,
} as const;

/**
 * Built-in skill IDs
 */
export const BUILTIN_SKILLS = {
  COMMIT: "commit",
  REVIEW_PR: "review-pr",
  EXPLAIN: "explain",
  FEATURE_DEV: "feature-dev",
} as const;

/**
 * Skill trigger patterns for common commands
 */
export const SKILL_TRIGGER_PATTERNS = {
  COMMIT: [
    "/commit",
    "commit changes",
    "commit this",
    "git commit",
    "make a commit",
  ],
  REVIEW_PR: [
    "/review-pr",
    "/review",
    "review pr",
    "review this pr",
    "review pull request",
    "code review",
  ],
  EXPLAIN: [
    "/explain",
    "explain this",
    "explain code",
    "what does this do",
    "how does this work",
  ],
  FEATURE_DEV: [
    "/feature",
    "/feature-dev",
    "implement feature",
    "new feature",
    "build feature",
  ],
} as const;

/**
 * Required fields in skill frontmatter
 */
export const SKILL_REQUIRED_FIELDS = ["id", "name", "description", "triggers"] as const;
