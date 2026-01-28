/**
 * Agent Result Interface
 */

import type { ToolCall, ToolResult } from "@tools/index";

export interface AgentResult {
  success: boolean;
  finalResponse: string;
  iterations: number;
  toolCalls: { call: ToolCall; result: ToolResult }[];
}
