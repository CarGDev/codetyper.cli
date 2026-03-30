/**
 * Debug File Logger
 *
 * Writes structured debug logs to /tmp/codetyper.cli.log when ENV=DEV.
 * Rotates at 512KB to prevent disk bloat.
 * Every significant operation is logged: API calls, tool executions,
 * permission checks, session events, provider routing, etc.
 */

import { writeFileSync, statSync, appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const LOG_FILE = "/tmp/codetyper.cli.log";
const MAX_LOG_SIZE = 512 * 1024; // 512KB

const isDevMode = (): boolean =>
  process.env.ENV === "DEV" || process.env.CODETYPER_DEBUG === "true";

let initialized = false;

const ensureLogFile = (): void => {
  if (initialized) return;
  initialized = true;
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    // Touch the file
    appendFileSync(LOG_FILE, "");
  } catch {
    // /tmp should always be writable
  }
};

const rotateIfNeeded = (): void => {
  try {
    const stat = statSync(LOG_FILE);
    if (stat.size > MAX_LOG_SIZE) {
      // Keep the last half of the file
      const { readFileSync } = require("fs");
      const content = readFileSync(LOG_FILE, "utf-8");
      const halfPoint = content.indexOf("\n", Math.floor(content.length / 2));
      const trimmed = halfPoint > 0 ? content.slice(halfPoint + 1) : content.slice(Math.floor(content.length / 2));
      writeFileSync(LOG_FILE, `[LOG ROTATED at ${new Date().toISOString()}]\n${trimmed}`);
    }
  } catch {
    // File might not exist yet
  }
};

const formatTimestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace("T", " ").slice(0, 23);
};

/**
 * Log a debug message to /tmp/codetyper.cli.log
 * Only writes when ENV=DEV or CODETYPER_DEBUG=true
 *
 * Accepts variadic args like console.log for easy migration:
 *   debugLog("api", "request to", url, { tokens: 500 })
 */
export const debugLog = (category: string, ...args: unknown[]): void => {
  if (!isDevMode()) return;

  ensureLogFile();
  rotateIfNeeded();

  const timestamp = formatTimestamp();
  const message = args.map((a) =>
    typeof a === "string" ? a : JSON.stringify(a),
  ).join(" ");
  const line = `[${timestamp}] [${category.toUpperCase().padEnd(12)}] ${message}\n`;

  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    // Best effort — don't crash the app for logging
  }
};

// Convenience helpers for common categories
export const logApi = (...args: unknown[]): void => debugLog("api", ...args);
export const logTool = (...args: unknown[]): void => debugLog("tool", ...args);
export const logAgent = (...args: unknown[]): void => debugLog("agent", ...args);
export const logProvider = (...args: unknown[]): void => debugLog("provider", ...args);
export const logSession = (...args: unknown[]): void => debugLog("session", ...args);
export const logPermission = (...args: unknown[]): void => debugLog("permission", ...args);
export const logTui = (...args: unknown[]): void => debugLog("tui", ...args);
export const logMcp = (...args: unknown[]): void => debugLog("mcp", ...args);

export const logError = (message: string, error?: unknown): void => {
  const errorInfo = error instanceof Error
    ? `${error.message} | ${error.stack?.split("\n").slice(0, 3).join(" | ")}`
    : error ? String(error) : "";
  debugLog("error", message, errorInfo);
};
