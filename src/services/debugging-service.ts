/**
 * Debugging Detection Service
 *
 * Detects debugging-related requests and provides debugging context.
 */

import {
  DEBUGGING_SYSTEM_PROMPT,
  DEBUGGING_CONTEXT_TEMPLATE,
} from "@prompts/system/debugging";

export interface DebugContext {
  isDebugging: boolean;
  errorMessage?: string;
  location?: string;
  expected?: string;
  actual?: string;
  stackTrace?: string;
  debugType: DebugType;
}

export type DebugType =
  | "error"
  | "bug"
  | "fix"
  | "issue"
  | "crash"
  | "broken"
  | "notworking"
  | "none";

const DEBUG_KEYWORDS: Record<DebugType, string[]> = {
  error: [
    "error",
    "exception",
    "throw",
    "thrown",
    "stack trace",
    "stacktrace",
    "traceback",
  ],
  bug: ["bug", "buggy", "glitch", "defect"],
  fix: ["fix", "fixing", "repair", "resolve", "solved"],
  issue: ["issue", "problem", "trouble", "wrong"],
  crash: ["crash", "crashed", "crashing", "dies", "killed"],
  broken: ["broken", "break", "breaks", "broke"],
  notworking: [
    "not working",
    "doesn't work",
    "doesn't work",
    "won't work",
    "isn't working",
    "stopped working",
    "no longer works",
    "fails",
    "failing",
    "failed",
  ],
  none: [],
};

const ERROR_PATTERNS = [
  // JavaScript/TypeScript errors
  /(?:TypeError|ReferenceError|SyntaxError|RangeError|Error):\s*.+/i,
  // Stack trace patterns
  /at\s+\w+\s+\([^)]+:\d+:\d+\)/,
  /^\s*at\s+.+\s+\(.+\)$/m,
  // Common error messages
  /cannot read propert(?:y|ies) of (?:undefined|null)/i,
  /is not a function/i,
  /is not defined/i,
  /unexpected token/i,
  /failed to/i,
  /unable to/i,
  // Exit codes
  /exit(?:ed)? (?:with )?(?:code|status) \d+/i,
  // HTTP errors
  /(?:4|5)\d{2}\s+(?:error|bad|not found|internal|forbidden)/i,
];

const extractErrorMessage = (input: string): string | undefined => {
  for (const pattern of ERROR_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return undefined;
};

const extractStackTrace = (input: string): string | undefined => {
  const lines = input.split("\n");
  const stackLines: string[] = [];
  let inStack = false;

  for (const line of lines) {
    if (/^\s*at\s+/.test(line) || /Error:/.test(line)) {
      inStack = true;
      stackLines.push(line);
    } else if (inStack && line.trim() === "") {
      break;
    } else if (inStack) {
      stackLines.push(line);
    }
  }

  return stackLines.length > 0 ? stackLines.join("\n") : undefined;
};

const extractLocation = (input: string): string | undefined => {
  // Match file:line:column patterns
  const patterns = [
    /([a-zA-Z0-9_\-./]+\.[a-zA-Z]+):(\d+)(?::(\d+))?/,
    /(?:in|at|file)\s+['"]?([^'":\s]+)['"]?\s*(?:line\s*)?(\d+)?/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const file = match[1];
      const line = match[2];
      const col = match[3];
      return col ? `${file}:${line}:${col}` : line ? `${file}:${line}` : file;
    }
  }
  return undefined;
};

const detectDebugType = (input: string): DebugType => {
  const lowerInput = input.toLowerCase();

  for (const [type, keywords] of Object.entries(DEBUG_KEYWORDS)) {
    if (type === "none") continue;
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return type as DebugType;
      }
    }
  }

  // Check for error patterns even without keywords
  if (ERROR_PATTERNS.some((pattern) => pattern.test(input))) {
    return "error";
  }

  return "none";
};

export const detectDebuggingRequest = (input: string): DebugContext => {
  const debugType = detectDebugType(input);

  if (debugType === "none") {
    return {
      isDebugging: false,
      debugType: "none",
    };
  }

  return {
    isDebugging: true,
    debugType,
    errorMessage: extractErrorMessage(input),
    location: extractLocation(input),
    stackTrace: extractStackTrace(input),
  };
};

export const buildDebuggingContext = (context: DebugContext): string => {
  if (!context.isDebugging) {
    return "";
  }

  let debugContext = DEBUGGING_CONTEXT_TEMPLATE.replace(
    "{{errorMessage}}",
    context.errorMessage || "Not specified",
  )
    .replace("{{location}}", context.location || "Not specified")
    .replace("{{expected}}", context.expected || "Not specified")
    .replace("{{actual}}", context.actual || "Not specified");

  if (context.stackTrace) {
    debugContext += `\n**Stack Trace**:\n\`\`\`\n${context.stackTrace}\n\`\`\`\n`;
  }

  return debugContext;
};

export const getDebuggingPrompt = (): string => {
  return DEBUGGING_SYSTEM_PROMPT;
};

export const enhancePromptForDebugging = (
  basePrompt: string,
  userInput: string,
): { prompt: string; context: DebugContext } => {
  const context = detectDebuggingRequest(userInput);

  if (!context.isDebugging) {
    return { prompt: basePrompt, context };
  }

  const debugPrompt = getDebuggingPrompt();
  const debugContext = buildDebuggingContext(context);

  const enhancedPrompt = `${basePrompt}\n\n${debugPrompt}\n${debugContext}`;

  return { prompt: enhancedPrompt, context };
};
