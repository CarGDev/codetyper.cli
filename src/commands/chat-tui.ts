/**
 * TUI-based Chat Command for CodeTyper CLI (Presentation Layer)
 *
 * This file is the main entry point for the chat TUI.
 * It assembles callbacks and re-exports the execute function.
 * All business logic is delegated to chat-tui-service.ts
 */

import type { ChatServiceCallbacks } from "@services/chat-tui-service.ts";
import { onModeChange } from "@commands/components/callbacks/on-mode-change.ts";
import { onLog } from "@commands/components/callbacks/on-log.ts";
import { onToolCall } from "@commands/components/callbacks/on-tool-call.ts";
import { onToolResult } from "@commands/components/callbacks/on-tool-result.ts";
import { onPermissionRequest } from "@commands/components/callbacks/on-permission-request.ts";
import { onLearningDetected } from "@commands/components/callbacks/on-learning-detected.ts";
import executeCommand from "@commands/components/execute/index.ts";

export const createCallbacks = (): ChatServiceCallbacks => ({
  onModeChange,
  onLog,
  onToolCall,
  onToolResult,
  onPermissionRequest,
  onLearningDetected,
});

export const execute = executeCommand;

export {
  onModeChange,
  onLog,
  onToolCall,
  onToolResult,
  onPermissionRequest,
  onLearningDetected,
};
