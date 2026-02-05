/**
 * TUI-based Chat Command for CodeTyper CLI (Presentation Layer)
 *
 * This file is the main entry point for the chat TUI.
 * It assembles callbacks and re-exports the execute function.
 * All business logic is delegated to chat-tui-service.ts
 */

import type { ChatServiceCallbacks } from "@services/chat-tui-service";
import { onModeChange } from "@commands/components/callbacks/on-mode-change";
import { onLog } from "@commands/components/callbacks/on-log";
import { onToolCall } from "@commands/components/callbacks/on-tool-call";
import { onToolResult } from "@commands/components/callbacks/on-tool-result";
import { onPermissionRequest } from "@commands/components/callbacks/on-permission-request";
import { onLearningDetected } from "@commands/components/callbacks/on-learning-detected";
import executeCommand from "@commands/components/execute/index";

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
