/**
 * Prompts Index
 *
 * Centralized exports for all system prompts.
 */

// System prompts
export { DEFAULT_SYSTEM_PROMPT } from "@prompts/system/default";
export { AGENTIC_SYSTEM_PROMPT, buildAgenticPrompt } from "@prompts/system/agent";
export { PLAN_SYSTEM_PROMPT } from "@prompts/system/planner";
export {
  DEBUGGING_SYSTEM_PROMPT,
  DEBUGGING_CONTEXT_TEMPLATE,
} from "@prompts/system/debugging";
export {
  CODE_REVIEW_SYSTEM_PROMPT,
  CODE_REVIEW_CONTEXT_TEMPLATE,
} from "@prompts/system/code-review";
export {
  REFACTORING_SYSTEM_PROMPT,
  REFACTORING_CONTEXT_TEMPLATE,
} from "@prompts/system/refactoring";
export {
  MEMORY_SYSTEM_PROMPT,
  MEMORY_CONTEXT_TEMPLATE,
  MEMORY_RETRIEVAL_PROMPT,
} from "@prompts/system/memory";

// Environment template
export { ENVIRONMENT_PROMPT_TEMPLATE } from "@prompts/system/environment";

// Environment service (logic moved to services)
export {
  buildEnvironmentPrompt,
  getEnvironmentContext,
  type EnvironmentContext,
} from "@services/environment-service";

// Debugging service
export {
  detectDebuggingRequest,
  buildDebuggingContext,
  getDebuggingPrompt,
  enhancePromptForDebugging,
  type DebugContext,
  type DebugType,
} from "@services/debugging-service";

// Code review service
export {
  detectCodeReviewRequest,
  buildCodeReviewContext,
  getCodeReviewPrompt,
  enhancePromptForCodeReview,
  type CodeReviewContext,
  type ReviewType,
  type ReviewFocusArea,
} from "@services/code-review-service";

// Refactoring service
export {
  detectRefactoringRequest,
  buildRefactoringContext,
  getRefactoringPrompt,
  enhancePromptForRefactoring,
  type RefactoringContext,
  type RefactoringType,
  type RefactoringGoal,
} from "@services/refactoring-service";

// Memory service
export {
  detectMemoryCommand,
  storeMemory,
  getMemories,
  findMemories,
  getRelevantMemories,
  buildMemoryContext,
  buildRelevantMemoryPrompt,
  getMemoryPrompt,
  processMemoryCommand,
  type MemoryContext,
  type MemoryCommandType,
  type MemoryCategory,
} from "@services/memory-service";

// Tool instructions
export {
  BASH_TOOL_INSTRUCTIONS,
  READ_TOOL_INSTRUCTIONS,
  WRITE_TOOL_INSTRUCTIONS,
  EDIT_TOOL_INSTRUCTIONS,
  GLOB_TOOL_INSTRUCTIONS,
  GREP_TOOL_INSTRUCTIONS,
  ALL_TOOL_INSTRUCTIONS,
} from "@prompts/system/tools";

// Git instructions
export {
  GIT_COMMIT_INSTRUCTIONS,
  GIT_PR_INSTRUCTIONS,
} from "@prompts/system/git";

// UI prompts
export { HELP_TEXT, COMMAND_DESCRIPTIONS } from "@prompts/ui/help";

// Re-export rules utilities for backwards compatibility
export {
  loadProjectRules,
  buildSystemPromptWithRules,
  getRulesForCategory,
} from "@services/rules-service";

export { MCP_CATEGORIES, TOOL_CATEGORIES } from "@constants/rules";

export type {
  ProjectRules,
  RuleFile,
  RuleCategory,
  MCPCategory,
  ToolCategory,
} from "@/types/rules";
