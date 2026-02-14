/**
 * Agent Result Interface
 */

import type { ToolCall, ToolResult } from "@/types/tools";

/** Why the agent loop stopped */
export type AgentStopReason =
  | "completed"           // LLM returned a final response (no more tool calls)
  | "max_iterations"      // Hit the iteration limit
  | "consecutive_errors"  // Repeated tool failures
  | "aborted"             // User abort
  | "error"               // Unrecoverable error
  | "plan_approval"       // Stopped to request plan approval
  ;

export interface AgentResult {
  success: boolean;
  finalResponse: string;
  iterations: number;
  toolCalls: { call: ToolCall; result: ToolResult }[];
  /** Why the agent stopped — helps the user understand what happened */
  stopReason?: AgentStopReason;
}
