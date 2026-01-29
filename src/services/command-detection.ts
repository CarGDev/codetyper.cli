/**
 * Command Detection Service
 *
 * Detects when user explicitly requests to run a command
 * and executes it directly without relying on LLM decision-making.
 */

import { executeBash } from "@tools/bash/execute";
import type { ToolContext } from "@/types/tools";
import { v4 as uuidv4 } from "uuid";

/**
 * Patterns that indicate an explicit command request
 */
const COMMAND_PATTERNS = [
  // "run <command>" patterns
  /^run\s+(.+)$/i,
  /^execute\s+(.+)$/i,
  /^exec\s+(.+)$/i,
  // "run a/the <command> command" patterns
  /^run\s+(?:a\s+|the\s+)?(.+?)\s+command$/i,
  // "use <command> to" patterns
  /^use\s+(\S+)\s+to\s+/i,
  // Direct command requests
  /^show\s+me\s+(?:the\s+)?(?:output\s+of\s+)?(.+)$/i,
  // "can you run" patterns
  /^(?:can\s+you\s+)?(?:please\s+)?run\s+(.+?)(?:\s+for\s+me)?$/i,
];

/**
 * Common shell commands that should be executed directly
 */
const DIRECT_COMMANDS = new Set([
  "ls",
  "tree",
  "pwd",
  "cat",
  "head",
  "tail",
  "find",
  "grep",
  "wc",
  "du",
  "df",
  "ps",
  "top",
  "which",
  "whoami",
  "date",
  "echo",
  "env",
  "printenv",
  "uname",
]);

export interface DetectedCommand {
  detected: boolean;
  command?: string;
  originalMessage: string;
}

/**
 * Detect if the user message is an explicit command request
 */
export const detectCommand = (message: string): DetectedCommand => {
  const trimmed = message.trim();

  // Check patterns
  for (const pattern of COMMAND_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const command = match[1].trim();
      // Validate it looks like a real command
      if (command && command.length > 0 && command.length < 500) {
        return {
          detected: true,
          command: normalizeCommand(command),
          originalMessage: message,
        };
      }
    }
  }

  // Check if message starts with a known command
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  if (DIRECT_COMMANDS.has(firstWord)) {
    return {
      detected: true,
      command: trimmed,
      originalMessage: message,
    };
  }

  return {
    detected: false,
    originalMessage: message,
  };
};

/**
 * Normalize command - handle common variations
 */
const normalizeCommand = (command: string): string => {
  // Remove quotes if wrapped
  if (
    (command.startsWith('"') && command.endsWith('"')) ||
    (command.startsWith("'") && command.endsWith("'"))
  ) {
    command = command.slice(1, -1);
  }

  // Handle "tree command" -> "tree"
  if (command.endsWith(" command")) {
    command = command.slice(0, -8).trim();
  }

  // Handle "the tree" -> "tree"
  if (command.startsWith("the ")) {
    command = command.slice(4);
  }

  // Handle "a ls" -> "ls"
  if (command.startsWith("a ")) {
    command = command.slice(2);
  }

  return command;
};

/**
 * Execute a detected command directly
 */
export const executeDetectedCommand = async (
  command: string,
  workingDir: string,
  abortController?: AbortController,
): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> => {
  const ctx: ToolContext = {
    sessionId: uuidv4(),
    messageId: uuidv4(),
    workingDir,
    abort: abortController ?? new AbortController(),
    autoApprove: true, // Direct command requests are auto-approved
    onMetadata: () => {},
  };

  const result = await executeBash({ command }, ctx);

  return {
    success: result.success,
    output: result.output,
    error: result.error,
  };
};
