import type { JSX } from "solid-js";

import type { ProviderModel } from "@/types/providers";

export type { ProviderModel };

export interface TuiInput {
  sessionId?: string;
  initialPrompt?: string;
  provider?: string;
  model?: string;
  theme?: string;
  workingDirectory?: string;
  availableModels?: ProviderModel[];
  cascadeEnabled?: boolean;
}

export interface TuiOutput {
  exitCode: number;
  sessionId?: string;
}

export type Route = { type: "home" } | { type: "session"; sessionId: string };

export type AppMode =
  | "idle"
  | "editing"
  | "thinking"
  | "tool_execution"
  | "permission_prompt"
  | "learning_prompt"
  | "command_menu"
  | "model_select"
  | "agent_select"
  | "theme_select"
  | "mcp_select"
  | "file_picker"
  | "help_menu"
  | "help_detail"
  | "error";

export type ScreenMode = "home" | "session";

export type LogEntryType =
  | "user"
  | "assistant"
  | "assistant_streaming"
  | "tool"
  | "error"
  | "system"
  | "thinking";

export interface LogEntry {
  id: string;
  type: LogEntryType;
  content: string;
  timestamp: number;
  metadata?: LogEntryMetadata;
}

export interface LogEntryMetadata {
  toolName?: string;
  toolStatus?: "pending" | "running" | "success" | "error";
  isStreaming?: boolean;
  thinkingDuration?: number;
  diffData?: DiffData;
  tokenCount?: number;
}

export interface DiffData {
  filePath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "error";
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface PermissionRequest {
  id: string;
  toolName: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  details?: Record<string, unknown>;
}

export interface LearningPrompt {
  id: string;
  question: string;
  options: LearningOption[];
  context?: string;
}

export interface LearningOption {
  label: string;
  value: string;
  description?: string;
}

export interface SessionStats {
  startTime: number;
  inputTokens: number;
  outputTokens: number;
  thinkingStartTime?: number;
  lastThinkingDuration?: number;
}

export interface SuggestionPrompt {
  id: string;
  text: string;
  category: string;
}

export interface CommandMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}

export type Children = JSX.Element | JSX.Element[] | null | undefined;
