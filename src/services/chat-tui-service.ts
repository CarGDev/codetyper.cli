/**
 * Chat TUI Service - Business logic for the chat interface
 *
 * This service handles all non-rendering logic:
 * - Session management
 * - Provider/model handling
 * - Message processing
 * - File context management
 * - Command execution
 * - Authentication flows
 * - Agent execution
 */

// Re-export types
export type {
  ChatServiceState,
  ChatServiceCallbacks,
  DiffResult,
  ToolCallInfo,
  ProviderDisplayInfo,
} from "@/types/chat-service";

// Re-export initialization
export { initializeChatService } from "@services/chat-tui/initialize";

// Re-export message handling
export { handleMessage } from "@services/chat-tui/message-handler";

// Re-export command handling
export { executeCommand } from "@services/chat-tui/commands";

// Re-export model handling
export {
  getProviderInfo,
  loadModels,
  handleModelSelect,
} from "@services/chat-tui/models";

// Re-export utilities
export {
  truncateOutput,
  detectDiffContent,
  getToolDescription,
} from "@services/chat-tui/utils";

// Re-export file handling
export {
  addContextFile,
  processFileReferences,
  buildContextMessage,
} from "@services/chat-tui/files";

// Re-export permission handling
export {
  createPermissionHandler,
  setupPermissionHandler,
  cleanupPermissionHandler,
} from "@services/chat-tui/permissions";

// Re-export print mode
export { executePrintMode } from "@services/chat-tui/print-mode";
