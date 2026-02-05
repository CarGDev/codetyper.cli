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

export type MCPRegistryTransport = "stdio" | "sse" | "http";

export interface MCPRegistryServer {
  id: string;
  name: string;
  description: string;
  author: string;
  repository: string;
  package: string;
  command: string;
  args: string[];
  category: MCPServerCategory;
  tags: string[];
  transport: MCPRegistryTransport;
  version: string;
  popularity: number;
  verified: boolean;
  installHint?: string;
  envVars?: string[];
  updatedAt: string;
}

export interface MCPSearchResult {
  servers: MCPRegistryServer[];
  total: number;
  query: string;
  category?: MCPServerCategory;
}

export interface MCPRegistrySource {
  name: string;
  url: string;
  enabled: boolean;
  lastFetched?: number;
}

export interface MCPRegistryCache {
  servers: MCPRegistryServer[];
  updatedAt: number;
  source: string;
}

export interface MCPSearchOptions {
  query?: string;
  category?: MCPServerCategory;
  tags?: string[];
  verifiedOnly?: boolean;
  sortBy?: "popularity" | "name" | "updated";
  limit?: number;
  offset?: number;
}

export interface MCPInstallResult {
  success: boolean;
  serverName: string;
  error?: string;
  connected: boolean;
}
