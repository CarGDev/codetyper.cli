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
 * Check if a command matches any blocked pattern
 */
export const checkDangerousCommand = (command: string): DangerCheckResult => {
  // Normalize command for checking
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
