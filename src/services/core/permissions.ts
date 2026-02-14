/**
 * Permission system for command execution
 *
 * Uses pattern matching format: Bash(command:args), Read(*), Write(*), Edit(*)
 *
 * Pattern examples:
 * - Bash(git:status)      - matches "git status"
 * - Bash(git:*)           - matches any git command
 * - Bash(npm install:*)   - matches npm install with any args
 * - Bash(mkdir:*)         - matches mkdir with any args
 * - Read(*)               - allow all file reads
 * - Write(src/*)          - allow writes to src directory
 * - Edit(*.ts)            - allow editing TypeScript files
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { DIRS, FILES, LOCAL_CONFIG_DIR } from "@constants/paths";
import type {
  ToolType,
  PermissionPattern,
  PermissionsConfig,
  PermissionHandler,
} from "@/types/permissions";

/**
 * Multi-word command prefixes for pattern generation
 */
const MULTI_WORD_PREFIXES = [
  "git",
  "npm",
  "yarn",
  "pnpm",
  "docker",
  "kubectl",
  "make",
];

/**
 * Simple tools that don't need arguments
 */
const SIMPLE_TOOLS: ToolType[] = ["WebSearch"];

/**
 * Permission state
 */
let globalAllowPatterns: string[] = [];
let globalDenyPatterns: string[] = [];
let localAllowPatterns: string[] = [];
let localDenyPatterns: string[] = [];
let sessionAllowPatterns: string[] = [];
let initialized = false;
let workingDir = process.cwd();
let permissionHandler: PermissionHandler | null = null;

/**
 * Set working directory
 */
export const setWorkingDir = (dir: string): void => {
  workingDir = dir;
};

/**
 * Set a custom permission handler (for TUI mode)
 */
export const setPermissionHandler = (
  handler: PermissionHandler | null,
): void => {
  permissionHandler = handler;
};

/**
 * Load permissions from file
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
 * Initialize permissions
 */
export const initializePermissions = async (): Promise<void> => {
  if (initialized) return;

  // Load global permissions
  const globalConfig = await loadPermissionsFile(FILES.settings);
  globalAllowPatterns = globalConfig.permissions?.allow ?? [];
  globalDenyPatterns = globalConfig.permissions?.deny ?? [];

  // Load local permissions
  const localConfig = await loadPermissionsFile(
    path.join(workingDir, LOCAL_CONFIG_DIR, "settings.json"),
  );
  localAllowPatterns = localConfig.permissions?.allow ?? [];
  localDenyPatterns = localConfig.permissions?.deny ?? [];

  sessionAllowPatterns = [];
  initialized = true;
};

/**
 * Parse a permission pattern string
 */
export const parsePattern = (pattern: string): PermissionPattern | null => {
  // Match patterns like: Bash(command:args), Read(path), WebFetch(domain:example.com)
  const match = pattern.match(/^(\w+)\(([^)]*)\)$/);
  if (!match) {
    // Simple patterns like "WebSearch"
    if (SIMPLE_TOOLS.includes(pattern as ToolType)) {
      return { tool: pattern as ToolType };
    }
    return null;
  }

  const tool = match[1] as ToolType;
  const content = match[2];

  if (tool === "Bash") {
    // Format: Bash(command:args) or Bash(command with spaces:args)
    const colonIdx = content.lastIndexOf(":");
    if (colonIdx === -1) {
      return { tool, command: content, args: "*" };
    }
    const command = content.slice(0, colonIdx);
    const args = content.slice(colonIdx + 1);
    return { tool, command, args };
  }

  if (tool === "WebFetch") {
    if (content.startsWith("domain:")) {
      return { tool, domain: content.slice(7) };
    }
    return { tool, path: content };
  }

  // Read, Write, Edit - just path pattern
  return { tool, path: content };
};

/**
 * Check if a command matches a parsed pattern
 */
export const matchesBashPattern = (
  command: string,
  pattern: PermissionPattern,
): boolean => {
  if (pattern.tool !== "Bash") return false;

  const patternCmd = pattern.command ?? "";
  const patternArgs = pattern.args ?? "*";

  if (!command.startsWith(patternCmd)) {
    return false;
  }

  if (patternArgs === "*") {
    return command === patternCmd || command.startsWith(patternCmd + " ");
  }

  const cmdArgs = command.slice(patternCmd.length).trim();

  if (patternArgs.endsWith("*")) {
    const prefix = patternArgs.slice(0, -1);
    return cmdArgs.startsWith(prefix);
  }

  return cmdArgs === patternArgs;
};

/**
 * Check if a file path matches a pattern
 */
export const matchesPathPattern = (
  filePath: string,
  pattern: string,
): boolean => {
  if (pattern === "*") return true;

  const normalizedPath = path.normalize(filePath);
  const normalizedPattern = path.normalize(pattern);

  if (pattern.endsWith("*")) {
    const prefix = normalizedPattern.slice(0, -1);
    return normalizedPath.startsWith(prefix);
  }

  if (pattern.startsWith("*.")) {
    const ext = pattern.slice(1);
    return normalizedPath.endsWith(ext);
  }

  return (
    normalizedPath === normalizedPattern ||
    normalizedPath.includes(normalizedPattern)
  );
};

/**
 * Split a shell command into individual sub-commands on chaining operators.
 * Handles &&, ||, ;, and | (pipe).
 * This prevents a pattern like Bash(cd:*) from silently approving
 * "cd /safe && rm -rf /dangerous".
 */
const splitChainedCommands = (command: string): string[] => {
  // Split on shell chaining operators, but not inside quoted strings.
  // Simple heuristic: split on &&, ||, ;, | (not ||) that are not inside quotes.
  const parts: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const next = command[i + 1];

    // Track quoting
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
    if (inSingle || inDouble) { current += ch; continue; }

    // Check for operators
    if (ch === "&" && next === "&") { parts.push(current); current = ""; i++; continue; }
    if (ch === "|" && next === "|") { parts.push(current); current = ""; i++; continue; }
    if (ch === ";") { parts.push(current); current = ""; continue; }
    if (ch === "|") { parts.push(current); current = ""; continue; }

    current += ch;
  }

  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
};

/**
 * Check if a Bash command is allowed.
 * For chained commands (&&, ||, ;, |), EVERY sub-command must be allowed.
 */
export const isBashAllowed = (command: string): boolean => {
  const subCommands = splitChainedCommands(command);

  const allPatterns = [
    ...sessionAllowPatterns,
    ...localAllowPatterns,
    ...globalAllowPatterns,
  ];

  // Every sub-command must match at least one allow pattern
  return subCommands.every((subCmd) =>
    allPatterns.some((patternStr) => {
      const pattern = parsePattern(patternStr);
      return (
        pattern &&
        pattern.tool === "Bash" &&
        matchesBashPattern(subCmd, pattern)
      );
    }),
  );
};

/**
 * Check if a Bash command is denied.
 * For chained commands, if ANY sub-command is denied, the whole command is denied.
 */
export const isBashDenied = (command: string): boolean => {
  const subCommands = splitChainedCommands(command);
  const denyPatterns = [...localDenyPatterns, ...globalDenyPatterns];

  // If any sub-command matches a deny pattern, deny the whole command
  return subCommands.some((subCmd) =>
    denyPatterns.some((patternStr) => {
      const pattern = parsePattern(patternStr);
      return (
        pattern &&
        pattern.tool === "Bash" &&
        matchesBashPattern(subCmd, pattern)
      );
    }),
  );
};

/**
 * Check if a file operation is allowed
 */
export const isFileOpAllowed = (
  tool: "Read" | "Write" | "Edit",
  filePath: string,
): boolean => {
  const allPatterns = [
    ...sessionAllowPatterns,
    ...localAllowPatterns,
    ...globalAllowPatterns,
  ];

  for (const patternStr of allPatterns) {
    const pattern = parsePattern(patternStr);
    if (pattern && pattern.tool === tool) {
      if (pattern.path && matchesPathPattern(filePath, pattern.path)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Generate a pattern for a single (non-chained) command
 */
const generateSingleBashPattern = (command: string): string => {
  const parts = command.trim().split(/\s+/);

  if (parts.length === 0) return `Bash(${command}:*)`;

  const firstWord = parts[0];

  if (MULTI_WORD_PREFIXES.includes(firstWord) && parts.length > 1) {
    const cmdPrefix = `${parts[0]} ${parts[1]}`;
    return `Bash(${cmdPrefix}:*)`;
  }

  return `Bash(${firstWord}:*)`;
};

/**
 * Generate patterns for the given command.
 * For chained commands (&&, ||, ;, |), returns one pattern per sub-command.
 * This prevents "Bash(cd:*)" from blanket-approving everything chained after cd.
 */
export const generateBashPattern = (command: string): string => {
  const subCommands = splitChainedCommands(command);

  if (subCommands.length <= 1) {
    return generateSingleBashPattern(command);
  }

  // For chained commands, return all unique patterns joined so the user can see them
  const patterns = [
    ...new Set(subCommands.map(generateSingleBashPattern)),
  ];
  return patterns.join(", ");
};

/**
 * Generate individual patterns for a command (used for storing)
 */
export const generateBashPatterns = (command: string): string[] => {
  const subCommands = splitChainedCommands(command);
  return [...new Set(subCommands.map(generateSingleBashPattern))];
};

/**
 * Add a pattern to session allow list
 */
export const addSessionPattern = (pattern: string): void => {
  if (!sessionAllowPatterns.includes(pattern)) {
    sessionAllowPatterns.push(pattern);
  }
};

/**
 * Save global permissions
 */
const saveGlobalPermissions = async (): Promise<void> => {
  let config: Record<string, unknown> = {};
  try {
    const data = await fs.readFile(FILES.settings, "utf-8");
    config = JSON.parse(data);
  } catch {
    // File doesn't exist
  }

  config.permissions = {
    allow: globalAllowPatterns,
    deny: globalDenyPatterns.length > 0 ? globalDenyPatterns : undefined,
  };

  await fs.mkdir(DIRS.config, { recursive: true });
  await fs.writeFile(FILES.settings, JSON.stringify(config, null, 2), "utf-8");
};

/**
 * Add a pattern to global allow list
 */
export const addGlobalPattern = async (pattern: string): Promise<void> => {
  if (!globalAllowPatterns.includes(pattern)) {
    globalAllowPatterns.push(pattern);
    await saveGlobalPermissions();
  }
};

/**
 * Save local permissions
 */
const saveLocalPermissions = async (): Promise<void> => {
  const filePath = path.join(workingDir, LOCAL_CONFIG_DIR, "settings.json");

  let config: Record<string, unknown> = {};
  try {
    const data = await fs.readFile(filePath, "utf-8");
    config = JSON.parse(data);
  } catch {
    // File doesn't exist
  }

  config.permissions = {
    allow: localAllowPatterns,
    deny: localDenyPatterns.length > 0 ? localDenyPatterns : undefined,
  };

  const configDir = path.join(workingDir, LOCAL_CONFIG_DIR);
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
};

/**
 * Add a pattern to local allow list
 */
export const addLocalPattern = async (pattern: string): Promise<void> => {
  if (!localAllowPatterns.includes(pattern)) {
    localAllowPatterns.push(pattern);
    await saveLocalPermissions();
  }
};

/**
 * List all patterns
 */
export const listPatterns = (): {
  global: string[];
  local: string[];
  session: string[];
} => ({
  global: [...globalAllowPatterns],
  local: [...localAllowPatterns],
  session: [...sessionAllowPatterns],
});

/**
 * Clear session patterns
 */
export const clearSessionPatterns = (): void => {
  sessionAllowPatterns = [];
};

/**
 * Handle permission scope — stores one or more patterns
 */
const handlePermissionScope = async (
  scope: string,
  patterns: string[],
): Promise<void> => {
  for (const pattern of patterns) {
    const scopeHandlers: Record<string, () => Promise<void> | void> = {
      session: () => addSessionPattern(pattern),
      local: () => addLocalPattern(pattern),
      global: () => addGlobalPattern(pattern),
    };

    const handler = scopeHandlers[scope];
    if (handler) {
      await handler();
    }
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
  const patterns = generateBashPatterns(command);

  // Use custom handler if set (TUI mode)
  if (permissionHandler) {
    const response = await permissionHandler({
      type: "bash",
      command,
      description,
      pattern: suggestedPattern,
    });

    if (response.allowed && response.scope) {
      await handlePermissionScope(response.scope, patterns);
    }

    return {
      allowed: response.allowed,
      remember: response.scope === "once" ? undefined : response.scope,
    };
  }

  // Fall back to readline-based prompt
  console.log("\n" + chalk.yellow("Permission Required"));
  console.log(chalk.gray("─".repeat(50)));
  console.log(chalk.cyan("Command: ") + chalk.white(command));
  if (description) {
    console.log(chalk.cyan("Description: ") + chalk.gray(description));
  }
  console.log(chalk.cyan("Pattern: ") + chalk.magenta(suggestedPattern));
  console.log(chalk.gray("─".repeat(50)));
  console.log("");
  console.log("  " + chalk.green("[y]") + " Yes, allow this command");
  console.log(
    "  " + chalk.blue("[s]") + " Yes, and allow pattern for this session",
  );
  console.log(
    "  " + chalk.cyan("[l]") + " Yes, and allow pattern for this project",
  );
  console.log("  " + chalk.magenta("[g]") + " Yes, and allow pattern globally");
  console.log("  " + chalk.red("[n]") + " No, deny this command");
  console.log("");

  return new Promise((resolve) => {
    process.stdout.write(chalk.yellow("Choice [y/s/l/g/n]: "));

    const handleInput = async (data: Buffer) => {
      const answer = data.toString().trim().toLowerCase();
      process.stdin.removeListener("data", handleInput);
      process.stdin.setRawMode?.(false);

      const addAllPatterns = async (
        addFn: (p: string) => void | Promise<void>,
      ): Promise<void> => {
        for (const p of patterns) await addFn(p);
      };

      const responseMap: Record<string, () => Promise<void>> = {
        y: async () => resolve({ allowed: true }),
        yes: async () => resolve({ allowed: true }),
        s: async () => {
          await addAllPatterns(addSessionPattern);
          console.log(
            chalk.blue(`\n✓ Added session patterns: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "session" });
        },
        session: async () => {
          await addAllPatterns(addSessionPattern);
          console.log(
            chalk.blue(`\n✓ Added session patterns: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "session" });
        },
        l: async () => {
          await addAllPatterns(addLocalPattern);
          console.log(
            chalk.cyan(`\n✓ Added project patterns: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "local" });
        },
        local: async () => {
          await addAllPatterns(addLocalPattern);
          console.log(
            chalk.cyan(`\n✓ Added project patterns: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "local" });
        },
        project: async () => {
          await addAllPatterns(addLocalPattern);
          console.log(
            chalk.cyan(`\n✓ Added project patterns: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "local" });
        },
        g: async () => {
          await addAllPatterns(addGlobalPattern);
          console.log(
            chalk.magenta(`\n✓ Added global patterns: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "global" });
        },
        global: async () => {
          await addAllPatterns(addGlobalPattern);
          console.log(
            chalk.magenta(`\n✓ Added global patterns: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "global" });
        },
      };

      const handler = responseMap[answer];
      if (handler) {
        await handler();
      } else {
        resolve({ allowed: false });
      }
    };

    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once("data", handleInput);
  });
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

  const ext = path.extname(filePath);
  const suggestedPattern = ext
    ? `${tool}(*${ext})`
    : `${tool}(${path.basename(filePath)})`;

  if (permissionHandler) {
    const response = await permissionHandler({
      type: tool.toLowerCase() as "read" | "write" | "edit",
      path: filePath,
      description: description ?? `${tool} ${filePath}`,
      pattern: suggestedPattern,
    });

    if (response.allowed && response.scope) {
      await handlePermissionScope(response.scope, [suggestedPattern]);
    }

    return {
      allowed: response.allowed,
      remember: response.scope === "once" ? undefined : response.scope,
    };
  }

  // Fall back to readline-based prompt
  console.log("\n" + chalk.yellow("Permission Required"));
  console.log(chalk.gray("─".repeat(50)));
  console.log(chalk.cyan(`${tool}: `) + chalk.white(filePath));
  if (description) {
    console.log(chalk.cyan("Description: ") + chalk.gray(description));
  }
  console.log(chalk.cyan("Pattern: ") + chalk.magenta(suggestedPattern));
  console.log(chalk.gray("─".repeat(50)));
  console.log("");
  console.log(
    "  " + chalk.green("[y]") + ` Yes, allow this ${tool.toLowerCase()}`,
  );
  console.log(
    "  " + chalk.blue("[s]") + " Yes, and allow pattern for this session",
  );
  console.log(
    "  " + chalk.cyan("[l]") + " Yes, and allow pattern for this project",
  );
  console.log("  " + chalk.magenta("[g]") + " Yes, and allow pattern globally");
  console.log("  " + chalk.red("[n]") + ` No, deny this ${tool.toLowerCase()}`);
  console.log("");

  return new Promise((resolve) => {
    process.stdout.write(chalk.yellow("Choice [y/s/l/g/n]: "));

    const handleInput = async (data: Buffer) => {
      const answer = data.toString().trim().toLowerCase();
      process.stdin.removeListener("data", handleInput);
      process.stdin.setRawMode?.(false);

      const responseMap: Record<string, () => Promise<void>> = {
        y: async () => resolve({ allowed: true }),
        yes: async () => resolve({ allowed: true }),
        s: async () => {
          addSessionPattern(suggestedPattern);
          console.log(
            chalk.blue(`\n✓ Added session pattern: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "session" });
        },
        session: async () => {
          addSessionPattern(suggestedPattern);
          console.log(
            chalk.blue(`\n✓ Added session pattern: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "session" });
        },
        l: async () => {
          await addLocalPattern(suggestedPattern);
          console.log(
            chalk.cyan(`\n✓ Added project pattern: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "local" });
        },
        local: async () => {
          await addLocalPattern(suggestedPattern);
          console.log(
            chalk.cyan(`\n✓ Added project pattern: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "local" });
        },
        project: async () => {
          await addLocalPattern(suggestedPattern);
          console.log(
            chalk.cyan(`\n✓ Added project pattern: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "local" });
        },
        g: async () => {
          await addGlobalPattern(suggestedPattern);
          console.log(
            chalk.magenta(`\n✓ Added global pattern: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "global" });
        },
        global: async () => {
          await addGlobalPattern(suggestedPattern);
          console.log(
            chalk.magenta(`\n✓ Added global pattern: ${suggestedPattern}`),
          );
          resolve({ allowed: true, remember: "global" });
        },
      };

      const handler = responseMap[answer];
      if (handler) {
        await handler();
      } else {
        resolve({ allowed: false });
      }
    };

    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once("data", handleInput);
  });
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

// Re-export types
export type {
  ToolType,
  PermissionPattern,
  PermissionsConfig,
  PermissionPromptRequest,
  PermissionPromptResponse,
  PermissionHandler,
} from "@/types/permissions";
