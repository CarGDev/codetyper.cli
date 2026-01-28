/**
 * Session Types
 */

import type { AgentType } from "@/types/index";

export interface SessionInfo {
  id: string;
  agent: AgentType;
  messageCount: number;
  lastMessage?: string;
  workingDirectory?: string;
  createdAt: number;
  updatedAt: number;
}
