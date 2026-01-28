/**
 * MCP (Model Context Protocol) Types
 */

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  /** Server identifier */
  name: string;
  /** Command to start the server */
  command: string;
  /** Arguments for the command */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Transport type */
  transport?: MCPTransportType;
  /** Server URL (for SSE/HTTP transport) */
  url?: string;
  /** Whether server is enabled */
  enabled?: boolean;
}

/**
 * Transport types supported by MCP
 */
export type MCPTransportType = "stdio" | "sse" | "http";

/**
 * MCP Configuration
 */
export interface MCPConfig {
  /** MCP servers configuration */
  servers: Record<string, MCPServerConfig>;
}

/**
 * MCP Tool Definition (from server)
 */
export interface MCPToolDefinition {
  /** Tool name */
  name: string;
  /** Tool description */
  description?: string;
  /** JSON Schema for parameters */
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP Resource Definition
 */
export interface MCPResourceDefinition {
  /** Resource URI */
  uri: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description?: string;
  /** MIME type */
  mimeType?: string;
}

/**
 * MCP Server Connection State
 */
export type MCPConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * MCP Server Instance (runtime)
 */
export interface MCPServerInstance {
  /** Server configuration */
  config: MCPServerConfig;
  /** Connection state */
  state: MCPConnectionState;
  /** Available tools */
  tools: MCPToolDefinition[];
  /** Available resources */
  resources: MCPResourceDefinition[];
  /** Error message if any */
  error?: string;
  /** Process ID if running via stdio */
  pid?: number;
}

/**
 * MCP Tool Call Request
 */
export interface MCPToolCallRequest {
  /** Server name */
  server: string;
  /** Tool name */
  tool: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

/**
 * MCP Tool Call Result
 */
export interface MCPToolCallResult {
  /** Whether the call succeeded */
  success: boolean;
  /** Result content */
  content?: unknown;
  /** Error message */
  error?: string;
}

/**
 * MCP Manager State
 */
export interface MCPManagerState {
  /** Configured servers */
  servers: Map<string, MCPServerInstance>;
  /** Whether manager is initialized */
  initialized: boolean;
}

/**
 * MCP Add Form Data (for TUI form submission)
 */
export interface MCPAddFormData {
  /** Server name */
  name: string;
  /** Command to run */
  command: string;
  /** Arguments (space-separated string) */
  args: string;
  /** Whether to save to global config */
  isGlobal: boolean;
}
