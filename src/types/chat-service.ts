/**
 * Chat service types
 */

import type { ProviderName, Message } from "@/types/providers";
import type {
  PermissionPromptRequest,
  PermissionPromptResponse,
} from "@/types/permissions";
import type { LearningCandidate } from "@services/learning-service";
import type { LearningResponse, InteractionMode } from "@/types/tui";

export interface ChatServiceState {
  provider: ProviderName;
  model: string | undefined;
  messages: Message[];
  contextFiles: Map<string, string>;
  systemPrompt: string;
  currentMode: InteractionMode;
  verbose: boolean;
  autoApprove: boolean;
}

export interface ChatServiceCallbacks {
  onModeChange: (mode: string) => void;
  onLog: (
    type: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) => void;
  onToolCall: (call: {
    id: string;
    name: string;
    description: string;
    args?: Record<string, unknown>;
  }) => void;
  onToolResult: (
    success: boolean,
    title: string,
    output?: string,
    error?: string,
  ) => void;
  onPermissionRequest: (
    request: PermissionPromptRequest,
  ) => Promise<PermissionPromptResponse>;
  onLearningDetected?: (
    candidate: LearningCandidate,
  ) => Promise<LearningResponse>;
}

export interface DiffResult {
  isDiff: boolean;
  filePath?: string;
  additions: number;
  deletions: number;
}

export interface ToolCallInfo {
  name: string;
  path?: string;
}

export interface ProviderDisplayInfo {
  displayName: string;
  model: string;
}
