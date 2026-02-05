/**
 * Agent Result Interface
 */

import type { ToolCall, ToolResult } from "@/types/tools";

export interface AgentResult {
  success: boolean;
  finalResponse: string;
  iterations: number;
  toolCalls: { call: ToolCall; result: ToolResult }[];
}
