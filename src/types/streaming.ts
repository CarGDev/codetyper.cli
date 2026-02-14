/**
 * Streaming Types for Agent Loop
 *
 * Types for real-time streaming of LLM responses to the TUI
 */

import type { ToolCall } from "@/types/tools";

// =============================================================================
// Stream State
// =============================================================================

export type StreamingStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "accumulating_tool"
  | "executing_tool"
  | "complete"
  | "error";

export interface StreamingState {
  status: StreamingStatus;
  content: string;
  pendingToolCalls: PartialToolCall[];
  completedToolCalls: ToolCall[];
  error: string | null;
  modelSwitched: ModelSwitchInfo | null;
}

export interface PartialToolCall {
  index: number;
  id: string;
  name: string;
  argumentsBuffer: string;
  isComplete: boolean;
}

export interface ModelSwitchInfo {
  from: string;
  to: string;
  reason: string;
}

// =============================================================================
// Stream Events
// =============================================================================

export type StreamEvent =
  | { type: "start" }
  | { type: "content"; content: string }
  | { type: "tool_call_start"; index: number; id: string; name: string }
  | { type: "tool_call_delta"; index: number; argumentsDelta: string }
  | { type: "tool_call_complete"; index: number }
  | { type: "model_switched"; info: ModelSwitchInfo }
  | { type: "done" }
  | { type: "error"; error: string };

// =============================================================================
// Callbacks
// =============================================================================

export interface StreamCallbacks {
  onContentChunk: (content: string) => void;
  onToolCallStart: (toolCall: PartialToolCall) => void;
  onToolCallComplete: (toolCall: ToolCall) => void;
  onModelSwitch: (info: ModelSwitchInfo) => void;
  onUsage: (usage: { promptTokens: number; completionTokens: number }) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

// =============================================================================
// Stream Accumulator
// =============================================================================

export interface StreamAccumulator {
  content: string;
  toolCalls: Map<number, PartialToolCall>;
  modelSwitch: ModelSwitchInfo | null;
}

// =============================================================================
// Initial State Factory
// =============================================================================

export const createInitialStreamingState = (): StreamingState => ({
  status: "idle",
  content: "",
  pendingToolCalls: [],
  completedToolCalls: [],
  error: null,
  modelSwitched: null,
});

export const createStreamAccumulator = (): StreamAccumulator => ({
  content: "",
  toolCalls: new Map(),
  modelSwitch: null,
});
