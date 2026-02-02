/**
 * XDG-compliant storage paths
 *
 * Follows the XDG Base Directory Specification:
 * - XDG_CONFIG_HOME: User configuration (~/.config)
 * - XDG_DATA_HOME: User data (~/.local/share)
 * - XDG_CACHE_HOME: Cache data (~/.cache)
 * - XDG_STATE_HOME: State data (~/.local/state)
 *
 * See: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
 */

import { homedir } from "os";
import { join } from "path";

const APP_NAME = "codetyper";

/**
 * XDG base directories with fallbacks
 */
export const XDG = {
  config: process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  data: process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"),
  cache: process.env.XDG_CACHE_HOME || join(homedir(), ".cache"),
  state: process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
} as const;

/**
 * Application directories
 */
export const DIRS = {
  /** Configuration directory (~/.config/codetyper) */
  config: join(XDG.config, APP_NAME),

  /** Data directory (~/.local/share/codetyper) */
  data: join(XDG.data, APP_NAME),

  /** Cache directory (~/.cache/codetyper) */
  cache: join(XDG.cache, APP_NAME),

  /** State directory (~/.local/state/codetyper) */
  state: join(XDG.state, APP_NAME),

  /** Sessions directory (~/.local/share/codetyper/sessions) */
  sessions: join(XDG.data, APP_NAME, "sessions"),
} as const;

/**
 * Application files
 */
export const FILES = {
  /** Main configuration file */
  config: join(DIRS.config, "config.json"),

  /** Keybindings configuration */
  keybindings: join(DIRS.config, "keybindings.json"),

  /** Provider credentials (stored in data, not config) */
  credentials: join(DIRS.data, "credentials.json"),

  /** Environment variables and tokens (API keys, JWT tokens, etc.) */
  vars: join(DIRS.config, "vars.json"),

  /** Command history */
  history: join(DIRS.data, "history.json"),

  /** Models cache */
  modelsCache: join(DIRS.cache, "models.json"),

  /** Copilot token cache */
  copilotTokenCache: join(DIRS.cache, "copilot-token.json"),

  /** Frecency cache for file/command suggestions */
  frecency: join(DIRS.cache, "frecency.json"),

  /** Key-value state storage */
  kvStore: join(DIRS.state, "kv.json"),

  /** Global settings (permissions, etc.) */
  settings: join(DIRS.config, "settings.json"),
} as const;

/**
 * Local project config directory name
 */
export const LOCAL_CONFIG_DIR = ".codetyper";

export const IGNORE_FOLDERS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.codetyper/**",
  "**/.vscode/**",
  "**/.idea/**",
  "**/__pycache__/**",
  "**/.DS_Store/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/venv/**",
];
