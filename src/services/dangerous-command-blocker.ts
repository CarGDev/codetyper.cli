/**
 * Dangerous Command Blocker Service
 *
 * Detects and blocks dangerous bash commands before execution.
 * This is a safety feature that cannot be bypassed, even with auto-approve.
 */

import {
  BLOCKED_PATTERNS,
  BLOCKED_COMMAND_MESSAGES,
  type BlockedPattern,
  type DangerCategory,
} from "@constants/dangerous-commands";

/**
 * Result of checking a command for danger
 */
export interface DangerCheckResult {
  blocked: boolean;
  pattern?: BlockedPattern;
  message?: string;
}

/**
 * Split a shell command into individual sub-commands on chaining operators.
 * Handles &&, ||, ;, and | (pipe). Respects quoted strings.
 */
const splitChainedCommands = (command: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const next = command[i + 1];

    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
    if (inSingle || inDouble) { current += ch; continue; }

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
 * Check if a command matches any blocked pattern.
 * For chained commands (&&, ||, ;, |), each sub-command is checked individually
 * to prevent dangerous commands hidden behind benign ones (e.g. cd /safe && rm -rf /).
 */
export const checkDangerousCommand = (command: string): DangerCheckResult => {
  const subCommands = splitChainedCommands(command);

  for (const subCmd of subCommands) {
    const normalized = subCmd.trim();
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.pattern.test(normalized)) {
        return {
          blocked: true,
          pattern,
          message: formatBlockedMessage(pattern),
        };
      }
    }
  }

  // Also check the full command in case a pattern targets the chaining itself
  const normalizedCommand = command.trim();
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.pattern.test(normalizedCommand)) {
      return {
        blocked: true,
        pattern,
        message: formatBlockedMessage(pattern),
      };
    }
  }

  return { blocked: false };
};

/**
 * Format a user-friendly blocked message
 */
const formatBlockedMessage = (pattern: BlockedPattern): string => {
  const categoryDescription =
    BLOCKED_COMMAND_MESSAGES.CATEGORY_DESCRIPTIONS[pattern.category];

  const lines = [
    `[${BLOCKED_COMMAND_MESSAGES.BLOCKED_PREFIX}] ${pattern.name}: ${pattern.description}`,
    "",
    `Category: ${formatCategoryName(pattern.category)}`,
    `Severity: ${pattern.severity.toUpperCase()}`,
    "",
    categoryDescription,
    "",
    BLOCKED_COMMAND_MESSAGES.CANNOT_BYPASS,
    BLOCKED_COMMAND_MESSAGES.SUGGESTION,
  ];

  return lines.join("\n");
};

/**
 * Format category name for display
 */
const formatCategoryName = (category: DangerCategory): string => {
  const names: Record<DangerCategory, string> = {
    destructive_delete: "Destructive Delete",
    privilege_escalation: "Privilege Escalation",
    system_damage: "System Damage",
    network_attack: "Network Attack",
    git_destructive: "Git Destructive",
    credential_exposure: "Credential Exposure",
  };
  return names[category];
};

/**
 * Get all blocked patterns (for configuration UI)
 */
export const getBlockedPatterns = (): readonly BlockedPattern[] => {
  return BLOCKED_PATTERNS;
};

/**
 * Check if a command is safe (inverse of dangerous check)
 */
export const isCommandSafe = (command: string): boolean => {
  return !checkDangerousCommand(command).blocked;
};

/**
 * Get categories of dangerous commands
 */
export const getDangerCategories = (): DangerCategory[] => {
  return [
    "destructive_delete",
    "privilege_escalation",
    "system_damage",
    "network_attack",
    "git_destructive",
    "credential_exposure",
  ];
};
