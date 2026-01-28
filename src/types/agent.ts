/**
 * Agent Types
 */

import type { Message } from "@/types/providers";

export interface ToolCallMessage {
  role: "assistant";
  content: string | null;
  tool_calls: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
}

export interface ToolResultMessage {
  role: "tool";
  tool_call_id: string;
  content: string;
}

export type AgentMessage = Message | ToolCallMessage | ToolResultMessage;
