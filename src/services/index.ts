/**
 * Services Module - Business logic extracted from UI components
 */

// Feature services
export * from "@services/file-picker-service";
export * from "@services/chat-tui-service";
export * from "@services/github-issue-service";
export * from "@services/command-suggestion-service";
export * from "@services/learning-service";
export * from "@services/rules-service";
export * as brainService from "@services/brain";

// Note: Core services (agent, permissions, session, executor, config) are imported
// directly from @services/core/* to avoid naming conflicts with chat-tui-service
