export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: MCPTransportType;
  url?: string;
  enabled?: boolean;
}

export type MCPTransportType = "stdio" | "sse" | "http";

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}

export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export type MCPConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface MCPServerInstance {
  config: MCPServerConfig;
  state: MCPConnectionState;
  tools: MCPToolDefinition[];
  resources: MCPResourceDefinition[];
  error?: string;
  pid?: number;
}

export interface MCPToolCallRequest {
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolCallResult {
  success: boolean;
  content?: unknown;
  error?: string;
}

export interface MCPManagerState {
  servers: Map<string, MCPServerInstance>;
  initialized: boolean;
}

export interface MCPAddFormData {
  name: string;
  command: string;
  args: string;
  isGlobal: boolean;
}
