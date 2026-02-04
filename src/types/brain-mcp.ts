/**
 * Brain MCP Server types
 * Exposes Brain as an MCP server for external tools
 */

export type BrainMcpToolName =
  | "brain_recall"
  | "brain_learn"
  | "brain_search"
  | "brain_relate"
  | "brain_context"
  | "brain_stats"
  | "brain_projects";

export interface BrainMcpServerConfig {
  readonly port: number;
  readonly host: string;
  readonly enableAuth: boolean;
  readonly apiKeyHeader: string;
  readonly allowedOrigins: ReadonlyArray<string>;
  readonly rateLimit: RateLimitConfig;
  readonly logging: LoggingConfig;
}

export interface RateLimitConfig {
  readonly enabled: boolean;
  readonly maxRequests: number;
  readonly windowMs: number;
}

export interface LoggingConfig {
  readonly enabled: boolean;
  readonly level: "debug" | "info" | "warn" | "error";
  readonly logRequests: boolean;
  readonly logResponses: boolean;
}

export interface BrainMcpTool {
  readonly name: BrainMcpToolName;
  readonly description: string;
  readonly inputSchema: McpInputSchema;
  readonly handler: string; // Function name in brain service
}

export interface McpInputSchema {
  readonly type: "object";
  readonly properties: Record<string, McpPropertySchema>;
  readonly required: ReadonlyArray<string>;
}

export interface McpPropertySchema {
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly description: string;
  readonly default?: unknown;
  readonly enum?: ReadonlyArray<string>;
  readonly items?: McpPropertySchema;
}

export interface BrainMcpRequest {
  readonly method: string;
  readonly params: {
    readonly name: BrainMcpToolName;
    readonly arguments: Record<string, unknown>;
  };
  readonly id: string | number;
}

export interface BrainMcpResponse {
  readonly id: string | number;
  readonly result?: {
    readonly content: ReadonlyArray<McpContent>;
    readonly isError?: boolean;
  };
  readonly error?: McpError;
}

export interface McpContent {
  readonly type: "text" | "resource";
  readonly text?: string;
  readonly resource?: McpResource;
}

export interface McpResource {
  readonly uri: string;
  readonly mimeType: string;
  readonly text?: string;
}

export interface McpError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export interface BrainMcpServerStatus {
  readonly running: boolean;
  readonly port: number;
  readonly host: string;
  readonly connectedClients: number;
  readonly uptime: number;
  readonly requestsServed: number;
  readonly lastRequestAt?: number;
}

export const DEFAULT_BRAIN_MCP_SERVER_CONFIG: BrainMcpServerConfig = {
  port: 5002,
  host: "localhost",
  enableAuth: true,
  apiKeyHeader: "X-Brain-API-Key",
  allowedOrigins: ["*"],
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
  logging: {
    enabled: true,
    level: "info",
    logRequests: true,
    logResponses: false,
  },
};

export const BRAIN_MCP_TOOLS: ReadonlyArray<BrainMcpTool> = [
  {
    name: "brain_recall",
    description: "Retrieve relevant concepts from the knowledge graph based on a query",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query to find relevant concepts" },
        limit: { type: "number", description: "Maximum number of concepts to return", default: 5 },
      },
      required: ["query"],
    },
    handler: "recall",
  },
  {
    name: "brain_learn",
    description: "Store a new concept in the knowledge graph",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the concept" },
        whatItDoes: { type: "string", description: "Description of what the concept does" },
        keywords: { type: "array", items: { type: "string", description: "Keyword item" }, description: "Keywords for the concept" },
        patterns: { type: "array", items: { type: "string", description: "Pattern item" }, description: "Code patterns related to the concept" },
        files: { type: "array", items: { type: "string", description: "File path item" }, description: "Files related to the concept" },
      },
      required: ["name", "whatItDoes"],
    },
    handler: "learn",
  },
  {
    name: "brain_search",
    description: "Search memories using semantic similarity",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        limit: { type: "number", description: "Maximum number of memories to return", default: 10 },
        type: { type: "string", description: "Memory type filter", enum: ["fact", "pattern", "correction", "preference", "context"] },
      },
      required: ["query"],
    },
    handler: "searchMemories",
  },
  {
    name: "brain_relate",
    description: "Create a relationship between two concepts",
    inputSchema: {
      type: "object",
      properties: {
        sourceConcept: { type: "string", description: "Name of the source concept" },
        targetConcept: { type: "string", description: "Name of the target concept" },
        relationType: { type: "string", description: "Type of relationship", enum: ["depends_on", "uses", "extends", "similar_to", "part_of", "implements", "contradicts"] },
        weight: { type: "number", description: "Strength of the relationship (0-1)", default: 0.5 },
      },
      required: ["sourceConcept", "targetConcept", "relationType"],
    },
    handler: "relate",
  },
  {
    name: "brain_context",
    description: "Build a context string from relevant knowledge for prompt injection",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The context query" },
        maxConcepts: { type: "number", description: "Maximum concepts to include", default: 5 },
      },
      required: ["query"],
    },
    handler: "getContext",
  },
  {
    name: "brain_stats",
    description: "Get statistics about the knowledge graph",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: "getStats",
  },
  {
    name: "brain_projects",
    description: "List all Brain projects",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: "listProjects",
  },
];

export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TOOL_NOT_FOUND: -32001,
  UNAUTHORIZED: -32002,
  RATE_LIMITED: -32003,
  BRAIN_UNAVAILABLE: -32004,
};
