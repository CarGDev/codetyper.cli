/**
 * Bash Command Pattern Matcher
 *
 * Optimized matching for Bash command patterns
 */

import type { PermissionPattern } from "@/types/permissions";
import type {
  PatternEntry,
  PatternIndex,
} from "@services/permissions/pattern-index";
import { getPatternsForTool } from "@services/permissions/pattern-index";

// =============================================================================
// Pattern Matching
// =============================================================================

/**
 * Check if a command matches a parsed Bash pattern
 */
export const matchesBashPattern = (
  command: string,
  pattern: PermissionPattern,
): boolean => {
  if (pattern.tool !== "Bash") return false;

  const patternCmd = pattern.command ?? "";
  const patternArgs = pattern.args ?? "*";

  // Command must start with pattern command
  if (!command.startsWith(patternCmd)) {
    return false;
  }

  // Wildcard args: match exact command or command with space
  if (patternArgs === "*") {
    return command === patternCmd || command.startsWith(patternCmd + " ");
  }

  // Extract actual args from command
  const cmdArgs = command.slice(patternCmd.length).trim();

  // Prefix match for args ending with *
  if (patternArgs.endsWith("*")) {
    const prefix = patternArgs.slice(0, -1);
    return cmdArgs.startsWith(prefix);
  }

  // Exact match on args
  return cmdArgs === patternArgs;
};

// =============================================================================
// Command Chaining
// =============================================================================

/**
 * Split a shell command on chaining operators (&&, ||, ;, |).
 * Respects quoted strings. Prevents pattern bypass via
 * "cd /safe && rm -rf /dangerous".
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

// =============================================================================
// Index-Based Matching
// =============================================================================

/**
 * Check if a command is allowed by any pattern in the index.
 * For chained commands (&&, ||, ;, |), EVERY sub-command must be allowed.
 */
export const isBashAllowedByIndex = (
  command: string,
  index: PatternIndex,
): boolean => {
  const subCommands = splitChainedCommands(command);
  const bashPatterns = getPatternsForTool(index, "Bash");

  return subCommands.every((subCmd) =>
    bashPatterns.some((entry) => matchesBashPattern(subCmd, entry.parsed)),
  );
};

/**
 * Find all matching patterns for a command
 */
export const findMatchingBashPatterns = (
  command: string,
  index: PatternIndex,
): PatternEntry[] => {
  const bashPatterns = getPatternsForTool(index, "Bash");
  return bashPatterns.filter((entry) =>
    matchesBashPattern(command, entry.parsed),
  );
};

// =============================================================================
// Pattern Generation
// =============================================================================

const MULTI_WORD_PREFIXES = [
  "git",
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "docker",
  "kubectl",
  "make",
  "cargo",
  "go",
];

/**
 * Generate a pattern suggestion for a command
 */
export const generateBashPattern = (command: string): string => {
  const parts = command.trim().split(/\s+/);

  if (parts.length === 0) {
    return `Bash(${command}:*)`;
  }

  const firstWord = parts[0];

  // For multi-word commands like "git status", use "git status" as prefix
  if (MULTI_WORD_PREFIXES.includes(firstWord) && parts.length > 1) {
    const cmdPrefix = `${parts[0]} ${parts[1]}`;
    return `Bash(${cmdPrefix}:*)`;
  }

  // For single commands, use just the command name
  return `Bash(${firstWord}:*)`;
};

/**
 * Extract command prefix for indexing/grouping
 */
export const extractCommandPrefix = (command: string): string => {
  const parts = command.trim().split(/\s+/);

  if (parts.length === 0) return command;

  const firstWord = parts[0];

  if (MULTI_WORD_PREFIXES.includes(firstWord) && parts.length > 1) {
    return `${parts[0]} ${parts[1]}`;
  }

  return firstWord;
};
