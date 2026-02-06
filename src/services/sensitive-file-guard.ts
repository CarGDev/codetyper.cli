/**
 * Sensitive File Guard Service
 *
 * Protects sensitive files (credentials, keys, etc.) from being
 * modified or inadvertently exposed.
 */

import {
  PROTECTED_FILE_PATTERNS,
  SENSITIVE_FILE_MESSAGES,
  type ProtectedFilePattern,
  type SensitiveFileCategory,
} from "@constants/sensitive-files";

/**
 * Type of file operation
 */
export type FileOperation = "read" | "write" | "edit" | "delete";

/**
 * Result of checking a file for sensitivity
 */
export interface SensitiveFileCheckResult {
  /** Whether the operation should be blocked */
  blocked: boolean;
  /** Whether to show a warning (for allowed reads) */
  warn: boolean;
  /** The matched pattern, if any */
  pattern?: ProtectedFilePattern;
  /** User-friendly message */
  message?: string;
}

/**
 * Check if a file operation on the given path should be blocked or warned
 */
export const checkSensitiveFile = (
  filePath: string,
  operation: FileOperation,
): SensitiveFileCheckResult => {
  // Normalize path for checking
  const normalizedPath = filePath.replace(/\\/g, "/");

  for (const pattern of PROTECTED_FILE_PATTERNS) {
    if (pattern.pattern.test(normalizedPath)) {
      // For read operations on files that allow reading
      if (operation === "read" && pattern.allowRead) {
        return {
          blocked: false,
          warn: true,
          pattern,
          message: formatWarningMessage(pattern),
        };
      }

      // For write/edit/delete or read on files that don't allow reading
      if (operation !== "read" || !pattern.allowRead) {
        return {
          blocked: true,
          warn: false,
          pattern,
          message: formatBlockedMessage(pattern, operation),
        };
      }
    }
  }

  return { blocked: false, warn: false };
};

/**
 * Format a warning message for sensitive file reads
 */
const formatWarningMessage = (pattern: ProtectedFilePattern): string => {
  const categoryDescription =
    SENSITIVE_FILE_MESSAGES.CATEGORY_DESCRIPTIONS[pattern.category];

  return [
    `[WARNING] ${pattern.description}`,
    "",
    categoryDescription,
    SENSITIVE_FILE_MESSAGES.WARN_READ,
  ].join("\n");
};

/**
 * Format a blocked message for sensitive file writes
 */
const formatBlockedMessage = (
  pattern: ProtectedFilePattern,
  operation: FileOperation,
): string => {
  const categoryDescription =
    SENSITIVE_FILE_MESSAGES.CATEGORY_DESCRIPTIONS[pattern.category];

  const operationText = operation === "read" ? "reading" : "modifying";
  const suggestion =
    operation === "read"
      ? SENSITIVE_FILE_MESSAGES.READ_SUGGESTION
      : SENSITIVE_FILE_MESSAGES.WRITE_SUGGESTION;

  return [
    `[BLOCKED] Cannot ${operation} ${pattern.description.toLowerCase()}`,
    "",
    `Category: ${formatCategoryName(pattern.category)}`,
    "",
    categoryDescription,
    SENSITIVE_FILE_MESSAGES.BLOCKED_REASON,
    "",
    suggestion,
  ].join("\n");
};

/**
 * Format category name for display
 */
const formatCategoryName = (category: SensitiveFileCategory): string => {
  const names: Record<SensitiveFileCategory, string> = {
    environment: "Environment Files",
    credentials: "Credential Files",
    ssh_keys: "SSH Keys",
    api_tokens: "API Tokens",
    certificates: "Certificates",
    cloud_config: "Cloud Configuration",
  };
  return names[category];
};

/**
 * Get all protected patterns (for configuration UI)
 */
export const getProtectedPatterns = (): readonly ProtectedFilePattern[] => {
  return PROTECTED_FILE_PATTERNS;
};

/**
 * Check if a file path is sensitive
 */
export const isSensitiveFile = (filePath: string): boolean => {
  const result = checkSensitiveFile(filePath, "read");
  return result.blocked || result.warn;
};

/**
 * Check if a file can be safely written
 */
export const canWriteFile = (filePath: string): boolean => {
  return !checkSensitiveFile(filePath, "write").blocked;
};

/**
 * Get categories of sensitive files
 */
export const getSensitiveFileCategories = (): SensitiveFileCategory[] => {
  return [
    "environment",
    "credentials",
    "ssh_keys",
    "api_tokens",
    "certificates",
    "cloud_config",
  ];
};
