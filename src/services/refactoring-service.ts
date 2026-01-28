/**
 * Refactoring Detection Service
 *
 * Detects refactoring requests and provides refactoring context.
 */

import {
  REFACTORING_SYSTEM_PROMPT,
  REFACTORING_CONTEXT_TEMPLATE,
} from "@prompts/system/refactoring";

export interface RefactoringContext {
  isRefactoring: boolean;
  refactoringType: RefactoringType;
  target?: string;
  goal?: RefactoringGoal;
}

export type RefactoringType =
  | "extract"
  | "inline"
  | "rename"
  | "move"
  | "simplify"
  | "decompose"
  | "general"
  | "none";

export type RefactoringGoal =
  | "readability"
  | "performance"
  | "maintainability"
  | "testability"
  | "duplication"
  | "complexity"
  | "general";

const REFACTORING_KEYWORDS: Record<
  Exclude<RefactoringType, "none">,
  string[]
> = {
  extract: [
    "extract function",
    "extract method",
    "extract variable",
    "extract constant",
    "extract class",
    "extract interface",
    "pull out",
    "break out",
    "separate into",
  ],
  inline: [
    "inline",
    "inline function",
    "inline variable",
    "merge into",
    "combine into",
  ],
  rename: ["rename", "better name", "naming", "change name", "call it"],
  move: [
    "move to",
    "relocate",
    "move function",
    "move method",
    "move class",
    "reorganize",
  ],
  simplify: [
    "simplify",
    "make simpler",
    "reduce complexity",
    "flatten",
    "clean up",
    "cleanup",
    "tidy",
  ],
  decompose: [
    "decompose",
    "break down",
    "split up",
    "divide into",
    "modularize",
  ],
  general: [
    "refactor",
    "refactoring",
    "restructure",
    "rewrite",
    "improve",
    "better way",
    "cleaner",
    "more readable",
    "more maintainable",
  ],
};

const GOAL_KEYWORDS: Record<RefactoringGoal, string[]> = {
  readability: [
    "readable",
    "readability",
    "understand",
    "clear",
    "clarity",
    "easier to read",
  ],
  performance: ["faster", "performance", "efficient", "optimize", "speed"],
  maintainability: [
    "maintainable",
    "maintainability",
    "easier to change",
    "flexible",
  ],
  testability: [
    "testable",
    "testability",
    "easier to test",
    "unit test",
    "mockable",
  ],
  duplication: [
    "duplication",
    "duplicate",
    "dry",
    "repeated",
    "copy paste",
    "same code",
  ],
  complexity: ["complexity", "complex", "complicated", "nested", "cyclomatic"],
  general: [],
};

const detectRefactoringType = (input: string): RefactoringType => {
  const lowerInput = input.toLowerCase();

  // Check specific types first (more specific before general)
  const typeOrder: Exclude<RefactoringType, "none">[] = [
    "extract",
    "inline",
    "rename",
    "move",
    "simplify",
    "decompose",
    "general",
  ];

  for (const type of typeOrder) {
    const keywords = REFACTORING_KEYWORDS[type];
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return type;
      }
    }
  }

  return "none";
};

const detectGoal = (input: string): RefactoringGoal | undefined => {
  const lowerInput = input.toLowerCase();

  for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS)) {
    if (goal === "general") continue;
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return goal as RefactoringGoal;
      }
    }
  }

  return undefined;
};

const extractTarget = (input: string): string | undefined => {
  const patterns = [
    // Function/method names
    /(?:refactor|extract|inline|rename|move|simplify)\s+(?:the\s+)?(?:function|method|class|variable|constant)?\s*[`"']?(\w+)[`"']?/i,
    // File references
    /(?:in|from|at)\s+[`"']?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`"']?/i,
    // This/the X pattern
    /(?:this|the)\s+(\w+)\s+(?:function|method|class|code)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
};

export const detectRefactoringRequest = (input: string): RefactoringContext => {
  const refactoringType = detectRefactoringType(input);

  if (refactoringType === "none") {
    return {
      isRefactoring: false,
      refactoringType: "none",
    };
  }

  return {
    isRefactoring: true,
    refactoringType,
    target: extractTarget(input),
    goal: detectGoal(input),
  };
};

export const buildRefactoringContext = (
  context: RefactoringContext,
): string => {
  if (!context.isRefactoring) {
    return "";
  }

  const typeLabels: Record<RefactoringType, string> = {
    extract: "Extract (function/variable/class)",
    inline: "Inline (function/variable)",
    rename: "Rename",
    move: "Move/Relocate",
    simplify: "Simplify/Clean up",
    decompose: "Decompose/Break down",
    general: "General Refactoring",
    none: "None",
  };

  const goalLabels: Record<RefactoringGoal, string> = {
    readability: "Improve Readability",
    performance: "Improve Performance",
    maintainability: "Improve Maintainability",
    testability: "Improve Testability",
    duplication: "Remove Duplication",
    complexity: "Reduce Complexity",
    general: "General Improvement",
  };

  return REFACTORING_CONTEXT_TEMPLATE.replace(
    "{{refactoringType}}",
    typeLabels[context.refactoringType],
  )
    .replace("{{target}}", context.target || "Not specified")
    .replace(
      "{{goal}}",
      context.goal ? goalLabels[context.goal] : "General Improvement",
    );
};

export const getRefactoringPrompt = (): string => {
  return REFACTORING_SYSTEM_PROMPT;
};

export const enhancePromptForRefactoring = (
  basePrompt: string,
  userInput: string,
): { prompt: string; context: RefactoringContext } => {
  const context = detectRefactoringRequest(userInput);

  if (!context.isRefactoring) {
    return { prompt: basePrompt, context };
  }

  const refactoringPrompt = getRefactoringPrompt();
  const refactoringContext = buildRefactoringContext(context);

  const enhancedPrompt = `${basePrompt}\n\n${refactoringPrompt}\n${refactoringContext}`;

  return { prompt: enhancedPrompt, context };
};
