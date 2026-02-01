/**
 * Session Fork Constants
 *
 * Constants for session snapshots and forks
 */

/**
 * File extension for fork files
 */
export const FORK_FILE_EXTENSION = ".fork.json";

/**
 * Main fork name
 */
export const MAIN_FORK_NAME = "main";

/**
 * Default snapshot name prefix
 */
export const DEFAULT_SNAPSHOT_PREFIX = "snapshot";

/**
 * Maximum snapshots per fork
 */
export const MAX_SNAPSHOTS_PER_FORK = 100;

/**
 * Maximum forks per session
 */
export const MAX_FORKS_PER_SESSION = 50;

/**
 * Fork file version for migration
 */
export const FORK_FILE_VERSION = 1;

/**
 * Session fork directory name
 */
export const FORKS_SUBDIR = "sessions";

/**
 * Auto-snapshot triggers
 */
export const AUTO_SNAPSHOT_TRIGGERS = {
  /** Messages since last snapshot to trigger auto-snapshot */
  MESSAGE_THRESHOLD: 10,
  /** Time in ms since last snapshot to trigger auto-snapshot */
  TIME_THRESHOLD: 300000, // 5 minutes
} as const;

/**
 * Commit message templates
 */
export const COMMIT_MESSAGE_TEMPLATES = {
  /** Template for code changes */
  CODE: "feat(session): {summary} [{count} messages]",
  /** Template for fix changes */
  FIX: "fix(session): {summary} [{count} messages]",
  /** Template for refactor changes */
  REFACTOR: "refactor(session): {summary} [{count} messages]",
  /** Template for docs changes */
  DOCS: "docs(session): {summary} [{count} messages]",
  /** Default template */
  DEFAULT: "chore(session): {summary} [{count} messages]",
} as const;

/**
 * Keywords for detecting commit types
 */
export const COMMIT_TYPE_KEYWORDS = {
  CODE: ["implement", "add", "create", "build", "feature"],
  FIX: ["fix", "bug", "resolve", "correct", "patch"],
  REFACTOR: ["refactor", "restructure", "reorganize", "improve"],
  DOCS: ["document", "readme", "comment", "explain"],
} as const;

/**
 * Fork command names
 */
export const FORK_COMMANDS = {
  SNAPSHOT: "/snapshot",
  REWIND: "/rewind",
  FORK: "/fork",
  FORKS: "/forks",
  SWITCH: "/switch",
} as const;

/**
 * Error messages for fork operations
 */
export const FORK_ERRORS = {
  SESSION_NOT_FOUND: "Session not found",
  SNAPSHOT_NOT_FOUND: "Snapshot not found",
  FORK_NOT_FOUND: "Fork not found",
  MAX_SNAPSHOTS_REACHED: "Maximum snapshots per fork reached",
  MAX_FORKS_REACHED: "Maximum forks per session reached",
  INVALID_SNAPSHOT_NAME: "Invalid snapshot name",
  INVALID_FORK_NAME: "Invalid fork name",
  DUPLICATE_SNAPSHOT_NAME: "Snapshot name already exists",
  DUPLICATE_FORK_NAME: "Fork name already exists",
  CANNOT_REWIND_TO_FUTURE: "Cannot rewind to a future snapshot",
  NO_SNAPSHOTS_TO_REWIND: "No snapshots to rewind to",
} as const;
