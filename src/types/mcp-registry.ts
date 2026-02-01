/**
 * MCP Registry Types
 *
 * Types for MCP server discovery and search
 */

/**
 * MCP server category
 */
export type MCPServerCategory =
  | "database"
  | "filesystem"
  | "web"
  | "ai"
  | "dev-tools"
  | "productivity"
  | "communication"
  | "cloud"
  | "security"
  | "other";

/**
 * MCP server transport type for registry
 */
export type MCPRegistryTransport = "stdio" | "sse" | "http";

/**
 * MCP server entry from registry
 */
export interface MCPRegistryServer {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Author/maintainer */
  author: string;
  /** Repository URL */
  repository: string;
  /** NPM package or command */
  package: string;
  /** Default command to run */
  command: string;
  /** Default arguments */
  args: string[];
  /** Category */
  category: MCPServerCategory;
  /** Tags for search */
  tags: string[];
  /** Transport type */
  transport: MCPRegistryTransport;
  /** Version */
  version: string;
  /** Downloads/popularity score */
  popularity: number;
  /** Whether verified by maintainers */
  verified: boolean;
  /** Installation instructions */
  installHint?: string;
  /** Environment variables needed */
  envVars?: string[];
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Search result from registry
 */
export interface MCPSearchResult {
  /** Matching servers */
  servers: MCPRegistryServer[];
  /** Total count */
  total: number;
  /** Search query */
  query: string;
  /** Category filter applied */
  category?: MCPServerCategory;
}

/**
 * Registry source configuration
 */
export interface MCPRegistrySource {
  /** Source name */
  name: string;
  /** API URL or file path */
  url: string;
  /** Whether enabled */
  enabled: boolean;
  /** Last fetched timestamp */
  lastFetched?: number;
}

/**
 * Cached registry data
 */
export interface MCPRegistryCache {
  /** All servers from registry */
  servers: MCPRegistryServer[];
  /** Last updated timestamp */
  updatedAt: number;
  /** Source URL */
  source: string;
}

/**
 * Search options
 */
export interface MCPSearchOptions {
  /** Search query */
  query?: string;
  /** Filter by category */
  category?: MCPServerCategory;
  /** Filter by tags */
  tags?: string[];
  /** Only verified servers */
  verifiedOnly?: boolean;
  /** Sort by */
  sortBy?: "popularity" | "name" | "updated";
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Installation result
 */
export interface MCPInstallResult {
  /** Whether successful */
  success: boolean;
  /** Server name */
  serverName: string;
  /** Error message if failed */
  error?: string;
  /** Whether connected after install */
  connected: boolean;
}
