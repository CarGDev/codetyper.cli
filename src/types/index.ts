/**
 * TypeScript type definitions for CodeTyper CLI
 */

export type AgentType = "coder" | "tester" | "refactorer" | "documenter";

// Re-export image types
export type {
  ImageMediaType,
  ImageContent,
  TextContent,
  MessageContent,
  MultimodalMessage,
  PastedImage,
} from "@/types/image";

export {
  isImageContent,
  isTextContent,
  createTextContent,
  createImageContent,
} from "@/types/image";

export type IntentType =
  | "ask"
  | "code"
  | "refactor"
  | "fix"
  | "document"
  | "test"
  | "explain";

export type Provider = "copilot" | "ollama";

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

export interface IntentRequest {
  prompt: string;
  context?: string;
  files?: string[];
}

export interface IntentResponse {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

export interface PlanStep {
  id: string;
  type: "read" | "edit" | "create" | "delete" | "execute";
  description: string;
  file?: string;
  dependencies?: string[];
  tool?: string;
  args?: Record<string, unknown>;
}

export interface ExecutionPlan {
  steps: PlanStep[];
  intent: IntentType;
  summary: string;
  estimatedTime?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  protectedPaths: string[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  agent: AgentType;
  messages: ChatMessage[];
  contextFiles: string[];
  createdAt: number;
  updatedAt: number;
}

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

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  files?: string[];
}

export interface FileEdit {
  file: string;
  search: string;
  replace: string;
  description?: string;
}

export interface TerminalSpinner {
  start(text: string): void;
  succeed(text: string): void;
  fail(text: string): void;
  stop(): void;
}
