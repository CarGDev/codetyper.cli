/**
 * Path Validation
 *
 * Validates file paths for shell metacharacters and injection patterns.
 * Prevents command injection via file path arguments in non-bash tools.
 */

/**
 * Shell metacharacters that should never appear in file paths.
 * These indicate command injection attempts.
 */
const SHELL_METACHARACTER_PATTERN = /[&|;`$(){}[\]<>!]/;

/**
 * Patterns that indicate shell command substitution
 */
const COMMAND_SUBSTITUTION_PATTERN = /\$\(|\$\{|`[^`]*`/;

/**
 * Check if a file path contains shell metacharacters.
 * Returns an error message if invalid, null if clean.
 */
export const validateFilePath = (filePath: string): string | null => {
  if (!filePath || filePath.trim().length === 0) {
    return "File path is empty";
  }

  if (COMMAND_SUBSTITUTION_PATTERN.test(filePath)) {
    return `File path contains shell command substitution: ${filePath}`;
  }

  if (SHELL_METACHARACTER_PATTERN.test(filePath)) {
    return `File path contains shell metacharacters: ${filePath}`;
  }

  // Check for null bytes (path traversal)
  if (filePath.includes("\0")) {
    return "File path contains null bytes";
  }

  return null;
};

/**
 * Returns true if the path is safe (no shell metacharacters)
 */
export const isPathSafe = (filePath: string): boolean =>
  validateFilePath(filePath) === null;
