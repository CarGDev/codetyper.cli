/**
 * Common types for CodeTyper CLI
 *
 * Basic domain types that don't belong to a specific feature module.
 */

/**
 * Agent type for different coding tasks
 */
export type AgentType = "coder" | "tester" | "refactorer" | "documenter";

/**
 * Intent classification for user requests
 */
export type IntentType =
  | "ask"
  | "code"
  | "refactor"
  | "fix"
  | "document"
  | "test"
  | "explain";

/**
 * Available LLM providers
 */
export type Provider = "copilot" | "ollama";

/**
 * Application configuration
 */
export interface Config {
  provider: Provider;
  model?: string;
  theme?: string;
  maxIterations: number;
  timeout: number;
  protectedPaths: string[];
  systemPrompt?: string;
  cascadeEnabled?: boolean;
}

/**
 * Intent detection request
 */
export interface IntentRequest {
  prompt: string;
  context?: string;
  files?: string[];
}

/**
 * Intent detection response
 */
export interface IntentResponse {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

/**
 * Plan step for execution
 */
export interface PlanStep {
  id: string;
  type: "read" | "edit" | "create" | "delete" | "execute";
  description: string;
  file?: string;
  dependencies?: string[];
  tool?: string;
  args?: Record<string, unknown>;
}

/**
 * Execution plan
 */
export interface ExecutionPlan {
  steps: PlanStep[];
  intent: IntentType;
  summary: string;
  estimatedTime?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  protectedPaths: string[];
}

/**
 * Chat message
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

/**
 * Chat session
 */
export interface ChatSession {
  id: string;
  agent: AgentType;
  messages: ChatMessage[];
  contextFiles: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Command options
 */
export interface CommandOptions {
  agent?: AgentType;
  model?: string;
  files?: string[];
  dryRun?: boolean;
  maxIterations?: number;
  autoApprove?: boolean;
  task?: string;
  prompt?: string;
  context?: string;
  intent?: IntentType;
  output?: string;
  planFile?: string;
  action?: string;
  key?: string;
  value?: string;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  files?: string[];
}

/**
 * File edit operation
 */
export interface FileEdit {
  file: string;
  search: string;
  replace: string;
  description?: string;
}

/**
 * Terminal spinner interface
 */
export interface TerminalSpinner {
  start(text: string): void;
  succeed(text: string): void;
  fail(text: string): void;
  stop(): void;
}
