/**
 * Brain MCP Server constants
 */

export const BRAIN_MCP_SERVER = {
  DEFAULT_PORT: 5002,
  DEFAULT_HOST: "localhost",
  REQUEST_TIMEOUT: 30000,
  MAX_CONNECTIONS: 100,
  HEARTBEAT_INTERVAL: 30000,
} as const;

export const BRAIN_MCP_RATE_LIMIT = {
  ENABLED: true,
  MAX_REQUESTS: 100,
  WINDOW_MS: 60000, // 1 minute
  BLOCK_DURATION: 300000, // 5 minutes
} as const;

export const BRAIN_MCP_AUTH = {
  HEADER: "X-Brain-API-Key",
  TOKEN_PREFIX: "Bearer",
  SESSION_DURATION: 3600000, // 1 hour
} as const;

export const BRAIN_MCP_COMMANDS = {
  START: "/brain mcp start",
  STOP: "/brain mcp stop",
  STATUS: "/brain mcp status",
  LOGS: "/brain mcp logs",
  CONFIG: "/brain mcp config",
} as const;

export const BRAIN_MCP_TOOL_NAMES = {
  RECALL: "brain_recall",
  LEARN: "brain_learn",
  SEARCH: "brain_search",
  RELATE: "brain_relate",
  CONTEXT: "brain_context",
  STATS: "brain_stats",
  PROJECTS: "brain_projects",
} as const;

export const BRAIN_MCP_MESSAGES = {
  SERVER_STARTED: "Brain MCP server started",
  SERVER_STOPPED: "Brain MCP server stopped",
  SERVER_ALREADY_RUNNING: "Brain MCP server is already running",
  SERVER_NOT_RUNNING: "Brain MCP server is not running",
  CLIENT_CONNECTED: "MCP client connected",
  CLIENT_DISCONNECTED: "MCP client disconnected",
  TOOL_EXECUTED: "Tool executed successfully",
  TOOL_FAILED: "Tool execution failed",
  UNAUTHORIZED: "Unauthorized request",
  RATE_LIMITED: "Rate limit exceeded",
  INVALID_REQUEST: "Invalid MCP request",
} as const;

export const BRAIN_MCP_ERRORS = {
  PARSE_ERROR: { code: -32700, message: "Parse error" },
  INVALID_REQUEST: { code: -32600, message: "Invalid request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS: { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR: { code: -32603, message: "Internal error" },
  TOOL_NOT_FOUND: { code: -32001, message: "Tool not found" },
  UNAUTHORIZED: { code: -32002, message: "Unauthorized" },
  RATE_LIMITED: { code: -32003, message: "Rate limited" },
  BRAIN_UNAVAILABLE: { code: -32004, message: "Brain service unavailable" },
} as const;

export const BRAIN_MCP_LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;
