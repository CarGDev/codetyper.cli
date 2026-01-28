/**
 * Permission Types
 */

export type ToolType =
  | "Bash"
  | "Read"
  | "Write"
  | "Edit"
  | "WebFetch"
  | "WebSearch";

export interface PermissionPattern {
  tool: ToolType;
  command?: string; // For Bash: the command prefix
  args?: string; // For Bash: the args pattern (* for any)
  path?: string; // For Read/Write/Edit: file path pattern
  domain?: string; // For WebFetch: domain pattern
}

export interface PermissionsConfig {
  permissions: {
    allow: string[];
    deny?: string[];
  };
}

export interface PermissionPromptRequest {
  type: "bash" | "read" | "write" | "edit";
  description: string;
  command?: string;
  path?: string;
  pattern: string;
}

export interface PermissionPromptResponse {
  allowed: boolean;
  scope?: "once" | "session" | "local" | "global";
}

export type PermissionHandler = (
  request: PermissionPromptRequest,
) => Promise<PermissionPromptResponse>;
