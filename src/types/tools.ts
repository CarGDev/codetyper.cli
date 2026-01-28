/**
 * Tool system types for agent execution
 */

import type { z } from "zod";

export type ToolStatus = "pending" | "running" | "completed" | "error";

export interface ToolContext {
  sessionId: string;
  messageId: string;
  workingDir: string;
  abort: AbortController;
  autoApprove?: boolean;
  onMetadata?: (metadata: ToolMetadata) => void;
}

export interface ToolMetadata {
  title?: string;
  output?: string;
  status?: ToolStatus;
  [key: string]: unknown;
}

export interface ToolResult {
  success: boolean;
  title: string;
  output: string;
  metadata?: ToolMetadata;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ToolDefinition<T extends z.ZodType = z.ZodType<any>> {
  name: string;
  description: string;
  parameters: T;
  execute: (args: z.infer<T>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  callId: string;
  name: string;
  result: ToolResult;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface BashParams {
  command: string;
  description: string;
  workdir?: string;
  timeout?: number;
}

export interface BashResultMetadata extends ToolMetadata {
  exitCode: number | null;
  timedOut?: boolean;
  aborted?: boolean;
}

export interface EditParams {
  filePath: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}

export interface EditResultMetadata extends ToolMetadata {
  filepath: string;
  replacements: number;
  additions: number;
  deletions: number;
}

export interface GlobOptions {
  cwd?: string;
  ignore?: string[];
  onlyFiles?: boolean;
  onlyDirectories?: boolean;
}

export interface GlobResult extends ToolResult {
  files?: string[];
}

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export interface GrepOptions {
  ignoreCase?: boolean;
  regex?: boolean;
  maxResults?: number;
}

export interface GrepResult extends ToolResult {
  files?: string[];
}

export interface ReadParams {
  filePath: string;
  offset?: number;
  limit?: number;
}

export interface ReadResultMetadata extends ToolMetadata {
  filepath: string;
  totalLines: number;
  linesRead: number;
  truncated: boolean;
  offset: number;
  isDirectory?: boolean;
  fileCount?: number;
}

export interface WriteParams {
  filePath: string;
  content: string;
}

export interface WriteResultMetadata extends ToolMetadata {
  filepath: string;
  exists: boolean;
  bytes: number;
  lines: number;
  additions: number;
  deletions: number;
}

export interface ViewResult extends ToolResult {
  content?: string;
}

export interface FileStat {
  size: number;
  modified: Date;
}
