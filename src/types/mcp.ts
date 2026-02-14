export type MCPTransportType = "stdio" | "sse" | "http";

/**
 * MCP server configuration as stored in mcp.json.
 *
 * For stdio servers:   { command, args?, env?, type?: "stdio" }
 * For http/sse servers: { url, type: "http" | "sse" }
 *
 * The `name` field is injected at runtime from the config key — it is
 * NOT persisted inside the server object.
 */
export interface MCPServerConfig {
  /** Runtime-only: injected from the config key, never written to disk */
  name?: string;
  /** Transport type (defaults to "stdio" when absent) */
  type?: MCPTransportType;
  /** Command to spawn (stdio transport) */
  command?: string;
  /** Arguments for the command (stdio transport) */
  args?: string[];
  /** Extra environment variables (stdio transport) */
  env?: Record<string, string>;
  /** Server URL (http / sse transport) */
  url?: string;
  /** Whether this server is enabled */
  enabled?: boolean;
}

export interface MCPConfig {
  /**
   * Reserved for MCP client runtime input wiring.
   * Keep for compatibility with MCP config schema.
   */
  inputs: unknown[];

  /**
   * Map of server name to server config.
   */
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
  type: MCPTransportType;
  /** Command (stdio) */
  command?: string;
  /** Arguments string (stdio) */
  args?: string;
  /** Server URL (http / sse) */
  url?: string;
  isGlobal: boolean;
}
