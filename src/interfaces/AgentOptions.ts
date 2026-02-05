/**
 * Agent Options Interface
 */

import type { ProviderName } from "@/types/providers";
import type { ToolCall, ToolResult } from "@/types/tools";

export interface AgentOptions {
  provider: ProviderName;
  model?: string;
  maxIterations?: number;
  onToolCall?: (call: ToolCall) => void;
  onToolResult?: (callId: string, result: ToolResult) => void;
  onText?: (text: string) => void;
  onThinking?: (text: string) => void;
  onError?: (error: string) => void;
  onWarning?: (warning: string) => void;
  verbose?: boolean;
  autoApprove?: boolean;
  /** Chat mode - only read-only tools, no file modifications */
  chatMode?: boolean;
}
