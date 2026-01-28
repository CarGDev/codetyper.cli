/**
 * Optimized Permission System
 *
 * Uses indexed patterns for O(n/k) lookup instead of O(n)
 * Caches parsed patterns for zero re-parsing overhead
 */

import fs from "fs/promises";
import path from "path";

import { DIRS, FILES, LOCAL_CONFIG_DIR } from "@constants/paths";
import type { PermissionsConfig, PermissionHandler } from "@/types/permissions";

import {
  clearPatternCache,
  warmCache,
} from "@services/permissions/pattern-cache";
import {
  buildPatternIndex,
  addToIndex,
  getRawPatterns,
  mergeIndexes,
  getIndexStats,
  type PatternIndex,
  type IndexStats,
} from "@services/permissions/pattern-index";
import {
  isBashAllowedByIndex,
  generateBashPattern,
} from "@services/permissions/matchers/bash";
import {
  isFileOpAllowedByIndex,
  generateFilePattern,
} from "@services/permissions/matchers/path";

// =============================================================================
// State
// =============================================================================

interface PermissionState {
  globalAllow: PatternIndex;
  globalDeny: PatternIndex;
  localAllow: PatternIndex;
  localDeny: PatternIndex;
  sessionAllow: PatternIndex;
  initialized: boolean;
  workingDir: string;
  permissionHandler: PermissionHandler | null;
}

let state: PermissionState = {
  globalAllow: buildPatternIndex([]),
  globalDeny: buildPatternIndex([]),
  localAllow: buildPatternIndex([]),
  localDeny: buildPatternIndex([]),
  sessionAllow: buildPatternIndex([]),
  initialized: false,
  workingDir: process.cwd(),
  permissionHandler: null,
};

// =============================================================================
// Initialization
// =============================================================================

/**
 * Load permissions from a file
 */
const loadPermissionsFile = async (
  filePath: string,
): Promise<PermissionsConfig> => {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { permissions: { allow: [] } };
  }
};

/**
 * Initialize the permission system
 */
export const initializePermissions = async (): Promise<void> => {
  if (state.initialized) return;

  // Load global permissions
  const globalConfig = await loadPermissionsFile(FILES.settings);
  const globalAllowPatterns = globalConfig.permissions?.allow ?? [];
  const globalDenyPatterns = globalConfig.permissions?.deny ?? [];

  // Load local permissions
  const localConfig = await loadPermissionsFile(
    path.join(state.workingDir, LOCAL_CONFIG_DIR, "settings.json"),
  );
  const localAllowPatterns = localConfig.permissions?.allow ?? [];
  const localDenyPatterns = localConfig.permissions?.deny ?? [];

  // Pre-warm the pattern cache
  warmCache([
    ...globalAllowPatterns,
    ...globalDenyPatterns,
    ...localAllowPatterns,
    ...localDenyPatterns,
  ]);

  // Build indexes
  state.globalAllow = buildPatternIndex(globalAllowPatterns);
  state.globalDeny = buildPatternIndex(globalDenyPatterns);
  state.localAllow = buildPatternIndex(localAllowPatterns);
  state.localDeny = buildPatternIndex(localDenyPatterns);
  state.sessionAllow = buildPatternIndex([]);
  state.initialized = true;
};

/**
 * Reset initialization (for testing)
 */
export const resetPermissions = (): void => {
  state = {
    globalAllow: buildPatternIndex([]),
    globalDeny: buildPatternIndex([]),
    localAllow: buildPatternIndex([]),
    localDeny: buildPatternIndex([]),
    sessionAllow: buildPatternIndex([]),
    initialized: false,
    workingDir: process.cwd(),
    permissionHandler: null,
  };
  clearPatternCache();
};

// =============================================================================
// Configuration
// =============================================================================

/**
 * Set working directory
 */
export const setWorkingDir = (dir: string): void => {
  state.workingDir = dir;
};

/**
 * Set custom permission handler (for TUI mode)
 */
export const setPermissionHandler = (
  handler: PermissionHandler | null,
): void => {
  state.permissionHandler = handler;
};

// =============================================================================
// Permission Checking (Optimized)
// =============================================================================

/**
 * Get merged allow index (session > local > global priority)
 */
const getMergedAllowIndex = (): PatternIndex =>
  mergeIndexes(state.sessionAllow, state.localAllow, state.globalAllow);

/**
 * Get merged deny index (local > global)
 */
const getMergedDenyIndex = (): PatternIndex =>
  mergeIndexes(state.localDeny, state.globalDeny);

/**
 * Check if a Bash command is allowed
 */
export const isBashAllowed = (command: string): boolean => {
  const allowIndex = getMergedAllowIndex();
  return isBashAllowedByIndex(command, allowIndex);
};

/**
 * Check if a Bash command is denied
 */
export const isBashDenied = (command: string): boolean => {
  const denyIndex = getMergedDenyIndex();
  return isBashAllowedByIndex(command, denyIndex);
};

/**
 * Check if a file operation is allowed
 */
export const isFileOpAllowed = (
  tool: "Read" | "Write" | "Edit",
  filePath: string,
): boolean => {
  const allowIndex = getMergedAllowIndex();
  return isFileOpAllowedByIndex(tool, filePath, allowIndex);
};

// =============================================================================
// Pattern Management
// =============================================================================

/**
 * Add a pattern to session allow list
 */
export const addSessionPattern = (pattern: string): void => {
  state.sessionAllow = addToIndex(state.sessionAllow, pattern);
};

/**
 * Save global permissions to disk
 */
const saveGlobalPermissions = async (): Promise<void> => {
  let config: Record<string, unknown> = {};
  try {
    const data = await fs.readFile(FILES.settings, "utf-8");
    config = JSON.parse(data);
  } catch {
    // File doesn't exist
  }

  const allowPatterns = getRawPatterns(state.globalAllow);
  const denyPatterns = getRawPatterns(state.globalDeny);

  config.permissions = {
    allow: allowPatterns,
    deny: denyPatterns.length > 0 ? denyPatterns : undefined,
  };

  await fs.mkdir(DIRS.config, { recursive: true });
  await fs.writeFile(FILES.settings, JSON.stringify(config, null, 2), "utf-8");
};

/**
 * Add a pattern to global allow list
 */
export const addGlobalPattern = async (pattern: string): Promise<void> => {
  state.globalAllow = addToIndex(state.globalAllow, pattern);
  await saveGlobalPermissions();
};

/**
 * Save local permissions to disk
 */
const saveLocalPermissions = async (): Promise<void> => {
  const filePath = path.join(
    state.workingDir,
    LOCAL_CONFIG_DIR,
    "settings.json",
  );

  let config: Record<string, unknown> = {};
  try {
    const data = await fs.readFile(filePath, "utf-8");
    config = JSON.parse(data);
  } catch {
    // File doesn't exist
  }

  const allowPatterns = getRawPatterns(state.localAllow);
  const denyPatterns = getRawPatterns(state.localDeny);

  config.permissions = {
    allow: allowPatterns,
    deny: denyPatterns.length > 0 ? denyPatterns : undefined,
  };

  const configDir = path.join(state.workingDir, LOCAL_CONFIG_DIR);
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
};

/**
 * Add a pattern to local allow list
 */
export const addLocalPattern = async (pattern: string): Promise<void> => {
  state.localAllow = addToIndex(state.localAllow, pattern);
  await saveLocalPermissions();
};

/**
 * List all patterns
 */
export const listPatterns = (): {
  global: string[];
  local: string[];
  session: string[];
} => ({
  global: getRawPatterns(state.globalAllow),
  local: getRawPatterns(state.localAllow),
  session: getRawPatterns(state.sessionAllow),
});

/**
 * Clear session patterns
 */
export const clearSessionPatterns = (): void => {
  state.sessionAllow = buildPatternIndex([]);
};

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get permission system statistics
 */
export const getPermissionStats = (): {
  global: IndexStats;
  local: IndexStats;
  session: IndexStats;
  initialized: boolean;
} => ({
  global: getIndexStats(state.globalAllow),
  local: getIndexStats(state.localAllow),
  session: getIndexStats(state.sessionAllow),
  initialized: state.initialized,
});

// =============================================================================
// Permission Prompts
// =============================================================================

/**
 * Handle permission scope after user response
 */
const handlePermissionScope = async (
  scope: string,
  pattern: string,
): Promise<void> => {
  const scopeHandlers: Record<string, () => Promise<void> | void> = {
    session: () => addSessionPattern(pattern),
    local: () => addLocalPattern(pattern),
    global: () => addGlobalPattern(pattern),
  };

  const handler = scopeHandlers[scope];
  if (handler) {
    await handler();
  }
};

/**
 * Prompt user for permission to execute a bash command
 */
export const promptBashPermission = async (
  command: string,
  description: string,
): Promise<{ allowed: boolean; remember?: "session" | "global" | "local" }> => {
  if (isBashDenied(command)) {
    return { allowed: false };
  }

  if (isBashAllowed(command)) {
    return { allowed: true };
  }

  const suggestedPattern = generateBashPattern(command);

  // Use custom handler if set (TUI mode)
  if (state.permissionHandler) {
    const response = await state.permissionHandler({
      type: "bash",
      command,
      description,
      pattern: suggestedPattern,
    });

    if (response.allowed && response.scope) {
      await handlePermissionScope(response.scope, suggestedPattern);
    }

    return {
      allowed: response.allowed,
      remember: response.scope === "once" ? undefined : response.scope,
    };
  }

  // No handler - default deny (TUI should always set handler)
  return { allowed: false };
};

/**
 * Prompt user for permission to perform a file operation
 */
export const promptFilePermission = async (
  tool: "Read" | "Write" | "Edit",
  filePath: string,
  description?: string,
): Promise<{ allowed: boolean; remember?: "session" | "global" | "local" }> => {
  if (isFileOpAllowed(tool, filePath)) {
    return { allowed: true };
  }

  const suggestedPattern = generateFilePattern(tool, filePath);

  if (state.permissionHandler) {
    const response = await state.permissionHandler({
      type: tool.toLowerCase() as "read" | "write" | "edit",
      path: filePath,
      description: description ?? `${tool} ${filePath}`,
      pattern: suggestedPattern,
    });

    if (response.allowed && response.scope) {
      await handlePermissionScope(response.scope, suggestedPattern);
    }

    return {
      allowed: response.allowed,
      remember: response.scope === "once" ? undefined : response.scope,
    };
  }

  // No handler - default deny
  return { allowed: false };
};

/**
 * Legacy method for backwards compatibility
 */
export const promptPermission = async (
  command: string,
  description: string,
): Promise<{ allowed: boolean; remember?: "session" | "global" }> => {
  const result = await promptBashPermission(command, description);
  return {
    allowed: result.allowed,
    remember: result.remember === "local" ? "global" : result.remember,
  };
};

/**
 * Legacy method
 */
export const getPermissionLevel = (
  command: string,
): "ask" | "allow_session" | "allow_global" | "deny" => {
  if (isBashDenied(command)) return "deny";
  if (isBashAllowed(command)) return "allow_global";
  return "ask";
};

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { generateBashPattern } from "@services/permissions/matchers/bash";
export { generateFilePattern } from "@services/permissions/matchers/path";
export { parsePattern } from "@services/permissions/pattern-cache";
export { matchesBashPattern } from "@services/permissions/matchers/bash";
export { matchesPathPattern } from "@services/permissions/matchers/path";
