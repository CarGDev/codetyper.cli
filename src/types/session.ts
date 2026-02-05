import type { AgentType } from "@/types/common";

export interface SessionInfo {
  id: string;
  agent: AgentType;
  messageCount: number;
  lastMessage?: string;
  workingDirectory?: string;
  createdAt: number;
  updatedAt: number;
  /** Parent session ID for subagent sessions */
  parentSessionId?: string;
  /** Whether this is a subagent session */
  isSubagent?: boolean;
  /** Subagent type if this is a subagent session */
  subagentType?: string;
}

/**
 * Configuration for creating a subagent session
 */
export interface SubagentSessionConfig {
  /** Parent session ID */
  parentSessionId: string;
  /** Type of subagent (explore, implement, test, etc.) */
  subagentType: string;
  /** Task description */
  task: string;
  /** Working directory */
  workingDirectory: string;
  /** Context files to include */
  contextFiles?: string[];
}
