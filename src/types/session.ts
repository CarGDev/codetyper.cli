import type { AgentType } from "@/types/common";

export interface SessionInfo {
  id: string;
  agent: AgentType;
  messageCount: number;
  lastMessage?: string;
  workingDirectory?: string;
  createdAt: number;
  updatedAt: number;
}
