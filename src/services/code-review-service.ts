/**
 * Code Review Detection Service
 *
 * Detects code review requests and provides review context.
 */

import {
  CODE_REVIEW_SYSTEM_PROMPT,
  CODE_REVIEW_CONTEXT_TEMPLATE,
} from "@prompts/system/code-review";

export interface CodeReviewContext {
  isReview: boolean;
  reviewType: ReviewType;
  focusArea?: ReviewFocusArea;
  filesChanged?: string[];
}

export type ReviewType =
  | "general"
  | "security"
  | "performance"
  | "refactor"
  | "pr"
  | "diff"
  | "none";

export type ReviewFocusArea =
  | "security"
  | "performance"
  | "maintainability"
  | "correctness"
  | "style"
  | "all";

const REVIEW_KEYWORDS: Record<Exclude<ReviewType, "none">, string[]> = {
  general: [
    "review",
    "code review",
    "look at this code",
    "check this code",
    "feedback on",
    "what do you think",
    "is this good",
    "is this correct",
    "review my code",
  ],
  security: [
    "security review",
    "security audit",
    "vulnerabilities",
    "security check",
    "is this secure",
    "security issues",
    "injection",
    "xss",
    "csrf",
  ],
  performance: [
    "performance review",
    "optimize",
    "slow",
    "faster",
    "efficiency",
    "bottleneck",
    "memory usage",
    "cpu usage",
  ],
  refactor: [
    "refactor",
    "refactoring",
    "clean up",
    "cleanup",
    "improve this",
    "better way",
    "simplify",
    "restructure",
  ],
  pr: [
    "pull request",
    "pr review",
    "merge request",
    "mr review",
    "review pr",
    "review this pr",
  ],
  diff: [
    "review diff",
    "review changes",
    "what changed",
    "review these changes",
    "look at the diff",
  ],
};

const FOCUS_KEYWORDS: Record<ReviewFocusArea, string[]> = {
  security: [
    "security",
    "secure",
    "vulnerability",
    "injection",
    "auth",
    "authentication",
    "authorization",
  ],
  performance: [
    "performance",
    "speed",
    "fast",
    "slow",
    "optimize",
    "efficient",
    "memory",
  ],
  maintainability: [
    "maintainability",
    "readable",
    "clean",
    "organize",
    "structure",
    "modular",
  ],
  correctness: ["correct", "bug", "wrong", "error", "logic", "edge case"],
  style: ["style", "formatting", "convention", "naming", "lint"],
  all: [],
};

const detectReviewType = (input: string): ReviewType => {
  const lowerInput = input.toLowerCase();

  // Check specific review types first (more specific)
  const typeOrder: Exclude<ReviewType, "none">[] = [
    "security",
    "performance",
    "pr",
    "diff",
    "refactor",
    "general",
  ];

  for (const type of typeOrder) {
    const keywords = REVIEW_KEYWORDS[type];
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return type;
      }
    }
  }

  return "none";
};

const detectFocusArea = (input: string): ReviewFocusArea | undefined => {
  const lowerInput = input.toLowerCase();

  for (const [area, keywords] of Object.entries(FOCUS_KEYWORDS)) {
    if (area === "all") continue;
    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        return area as ReviewFocusArea;
      }
    }
  }

  return undefined;
};

const extractFileReferences = (input: string): string[] | undefined => {
  const filePatterns = [
    // Common file extensions
    /([a-zA-Z0-9_\-./]+\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|rb|php|swift|kt))/g,
    // File paths
    /(?:file|in|at)\s+[`"']?([^`"'\s]+)[`"']?/gi,
  ];

  const files: Set<string> = new Set();

  for (const pattern of filePatterns) {
    const matches = input.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        files.add(match[1]);
      }
    }
  }

  return files.size > 0 ? Array.from(files) : undefined;
};

export const detectCodeReviewRequest = (input: string): CodeReviewContext => {
  const reviewType = detectReviewType(input);

  if (reviewType === "none") {
    return {
      isReview: false,
      reviewType: "none",
    };
  }

  return {
    isReview: true,
    reviewType,
    focusArea: detectFocusArea(input),
    filesChanged: extractFileReferences(input),
  };
};

export const buildCodeReviewContext = (context: CodeReviewContext): string => {
  if (!context.isReview) {
    return "";
  }

  const reviewTypeLabels: Record<ReviewType, string> = {
    general: "General Code Review",
    security: "Security Review",
    performance: "Performance Review",
    refactor: "Refactoring Review",
    pr: "Pull Request Review",
    diff: "Diff Review",
    none: "None",
  };

  const focusAreaLabels: Record<ReviewFocusArea, string> = {
    security: "Security",
    performance: "Performance",
    maintainability: "Maintainability",
    correctness: "Correctness",
    style: "Style & Conventions",
    all: "All Areas",
  };

  return CODE_REVIEW_CONTEXT_TEMPLATE.replace(
    "{{reviewType}}",
    reviewTypeLabels[context.reviewType],
  )
    .replace(
      "{{filesChanged}}",
      context.filesChanged?.join(", ") || "Not specified",
    )
    .replace(
      "{{focusArea}}",
      context.focusArea ? focusAreaLabels[context.focusArea] : "All Areas",
    );
};

export const getCodeReviewPrompt = (): string => {
  return CODE_REVIEW_SYSTEM_PROMPT;
};

export const enhancePromptForCodeReview = (
  basePrompt: string,
  userInput: string,
): { prompt: string; context: CodeReviewContext } => {
  const context = detectCodeReviewRequest(userInput);

  if (!context.isReview) {
    return { prompt: basePrompt, context };
  }

  const reviewPrompt = getCodeReviewPrompt();
  const reviewContext = buildCodeReviewContext(context);

  const enhancedPrompt = `${basePrompt}\n\n${reviewPrompt}\n${reviewContext}`;

  return { prompt: enhancedPrompt, context };
};
