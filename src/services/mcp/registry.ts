/**
 * MCP Registry Service
 *
 * Service for discovering, searching, and installing MCP servers
 */

import { homedir } from "os";
import { join } from "path";
import type {
  MCPRegistryServer,
  MCPSearchResult,
  MCPSearchOptions,
  MCPRegistryCache,
  MCPInstallResult,
  MCPServerCategory,
} from "@/types/mcp-registry";
import {
  MCP_CURATED_SERVERS,
  MCP_REGISTRY_CACHE,
  MCP_REGISTRY_SOURCES,
  MCP_REGISTRY_ERRORS,
  MCP_REGISTRY_SUCCESS,
  MCP_SEARCH_DEFAULTS,
} from "@constants/mcp-registry";
import { addServer, connectServer, getServerInstances } from "./manager";

/**
 * In-memory cache for registry data
 */
let registryCache: MCPRegistryCache | null = null;

/**
 * Get cache file path
 */
const getCacheFilePath = (): string => {
  return join(homedir(), ".codetyper", MCP_REGISTRY_CACHE.FILE_NAME);
};

/**
 * Load cache from disk
 */
const loadCache = async (): Promise<MCPRegistryCache | null> => {
  try {
    const cachePath = getCacheFilePath();
    const file = Bun.file(cachePath);
    if (await file.exists()) {
      const data = await file.json();
      return data as MCPRegistryCache;
    }
  } catch {
    // Cache doesn't exist or is invalid
  }
  return null;
};

/**
 * Save cache to disk
 */
const saveCache = async (cache: MCPRegistryCache): Promise<void> => {
  try {
    const cachePath = getCacheFilePath();
    await Bun.write(cachePath, JSON.stringify(cache, null, 2));
  } catch {
    // Ignore cache write errors
  }
};

/**
 * Check if cache is valid (not expired)
 */
const isCacheValid = (cache: MCPRegistryCache): boolean => {
  const now = Date.now();
  return now - cache.updatedAt < MCP_REGISTRY_CACHE.DURATION_MS;
};

/**
 * Fetch servers from Smithery registry
 */
const fetchFromSmithery = async (): Promise<MCPRegistryServer[]> => {
  try {
    const response = await fetch(MCP_REGISTRY_SOURCES.SMITHERY);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();

    // Transform Smithery format to our format
    if (Array.isArray(data)) {
      return data.map((server: Record<string, unknown>) => ({
        id: String(server.name || server.id || ""),
        name: String(server.displayName || server.name || ""),
        description: String(server.description || ""),
        author: String(server.author || server.vendor || "Community"),
        repository: String(server.homepage || server.repository || ""),
        package: String(server.qualifiedName || server.package || ""),
        command: "npx",
        args: ["-y", String(server.qualifiedName || server.package || "")],
        category: mapCategory(String(server.category || "other")),
        tags: Array.isArray(server.tags) ? server.tags.map(String) : [],
        transport: "stdio" as const,
        version: String(server.version || "latest"),
        popularity: Number(server.downloads || server.useCount || 0),
        verified: Boolean(server.verified || server.isOfficial),
        installHint: String(server.installHint || ""),
        envVars: Array.isArray(server.environmentVariables)
          ? server.environmentVariables.map(String)
          : undefined,
        updatedAt: String(server.updatedAt || new Date().toISOString()),
      }));
    }
    return [];
  } catch {
    return [];
  }
};

/**
 * Map external category to our category type
 */
const mapCategory = (category: string): MCPServerCategory => {
  const categoryMap: Record<string, MCPServerCategory> = {
    database: "database",
    databases: "database",
    db: "database",
    filesystem: "filesystem",
    files: "filesystem",
    file: "filesystem",
    web: "web",
    browser: "web",
    http: "web",
    ai: "ai",
    ml: "ai",
    "machine-learning": "ai",
    "dev-tools": "dev-tools",
    developer: "dev-tools",
    development: "dev-tools",
    tools: "dev-tools",
    productivity: "productivity",
    communication: "communication",
    chat: "communication",
    messaging: "communication",
    cloud: "cloud",
    aws: "cloud",
    gcp: "cloud",
    azure: "cloud",
    security: "security",
  };

  const normalized = category.toLowerCase().trim();
  return categoryMap[normalized] || "other";
};

/**
 * Get all servers (curated + external)
 */
export const getAllServers = async (
  forceRefresh = false
): Promise<MCPRegistryServer[]> => {
  // Check in-memory cache first
  if (!forceRefresh && registryCache && isCacheValid(registryCache)) {
    return registryCache.servers;
  }

  // Check disk cache
  if (!forceRefresh) {
    const diskCache = await loadCache();
    if (diskCache && isCacheValid(diskCache)) {
      registryCache = diskCache;
      return diskCache.servers;
    }
  }

  // Fetch from external sources
  const externalServers = await fetchFromSmithery();

  // Merge curated servers with external, curated takes precedence
  const curatedIds = new Set(MCP_CURATED_SERVERS.map((s) => s.id));
  const filteredExternal = externalServers.filter((s) => !curatedIds.has(s.id));

  const allServers = [...MCP_CURATED_SERVERS, ...filteredExternal];

  // Update cache
  registryCache = {
    servers: allServers,
    updatedAt: Date.now(),
    source: MCP_REGISTRY_SOURCES.SMITHERY,
  };

  await saveCache(registryCache);

  return allServers;
};

/**
 * Get curated servers only (no network)
 */
export const getCuratedServers = (): MCPRegistryServer[] => {
  return MCP_CURATED_SERVERS;
};

/**
 * Search for MCP servers
 */
export const searchServers = async (
  options: MCPSearchOptions = {}
): Promise<MCPSearchResult> => {
  const {
    query = "",
    category,
    tags,
    verifiedOnly = false,
    sortBy = MCP_SEARCH_DEFAULTS.SORT_BY,
    limit = MCP_SEARCH_DEFAULTS.LIMIT,
    offset = 0,
  } = options;

  const allServers = await getAllServers();

  let filtered = allServers;

  // Filter by query
  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter((server) => {
      const searchableText = [
        server.name,
        server.description,
        server.author,
        ...server.tags,
      ].join(" ").toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }

  // Filter by category
  if (category) {
    filtered = filtered.filter((server) => server.category === category);
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    filtered = filtered.filter((server) =>
      tags.some((tag) =>
        server.tags.some((serverTag) =>
          serverTag.toLowerCase().includes(tag.toLowerCase())
        )
      )
    );
  }

  // Filter verified only
  if (verifiedOnly) {
    filtered = filtered.filter((server) => server.verified);
  }

  // Sort
  const sortFunctions: Record<string, (a: MCPRegistryServer, b: MCPRegistryServer) => number> = {
    popularity: (a, b) => b.popularity - a.popularity,
    name: (a, b) => a.name.localeCompare(b.name),
    updated: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  };

  filtered.sort(sortFunctions[sortBy] || sortFunctions.popularity);

  // Paginate
  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    servers: paginated,
    total,
    query,
    category,
  };
};

/**
 * Get server by ID
 */
export const getServerById = async (
  id: string
): Promise<MCPRegistryServer | undefined> => {
  const allServers = await getAllServers();
  return allServers.find((server) => server.id === id);
};

/**
 * Get servers by category
 */
export const getServersByCategory = async (
  category: MCPServerCategory
): Promise<MCPRegistryServer[]> => {
  const allServers = await getAllServers();
  return allServers.filter((server) => server.category === category);
};

/**
 * Check if a server is already installed
 */
export const isServerInstalled = (serverId: string): boolean => {
  const instances = getServerInstances();
  return instances.some((instance) =>
    instance.config.name === serverId ||
    instance.config.name.toLowerCase() === serverId.toLowerCase()
  );
};

/**
 * Install an MCP server from the registry
 */
export const installServer = async (
  server: MCPRegistryServer,
  options: {
    global?: boolean;
    connect?: boolean;
    customArgs?: string[];
  } = {}
): Promise<MCPInstallResult> => {
  const { global = false, connect = true, customArgs } = options;

  // Check if already installed
  if (isServerInstalled(server.id)) {
    return {
      success: false,
      serverName: server.id,
      error: MCP_REGISTRY_ERRORS.ALREADY_INSTALLED,
      connected: false,
    };
  }

  try {
    // Add server to configuration
    await addServer(
      {
        name: server.id,
        command: server.command,
        args: customArgs || server.args,
        transport: server.transport,
        enabled: true,
      },
      global
    );

    let connected = false;

    // Connect if requested
    if (connect) {
      try {
        await connectServer(server.id);
        connected = true;
      } catch {
        // Server added but connection failed
      }
    }

    return {
      success: true,
      serverName: server.id,
      connected,
    };
  } catch (error) {
    return {
      success: false,
      serverName: server.id,
      error: error instanceof Error ? error.message : MCP_REGISTRY_ERRORS.INSTALL_FAILED,
      connected: false,
    };
  }
};

/**
 * Install server by ID
 */
export const installServerById = async (
  serverId: string,
  options: {
    global?: boolean;
    connect?: boolean;
    customArgs?: string[];
  } = {}
): Promise<MCPInstallResult> => {
  const server = await getServerById(serverId);

  if (!server) {
    return {
      success: false,
      serverName: serverId,
      error: MCP_REGISTRY_ERRORS.NOT_FOUND,
      connected: false,
    };
  }

  return installServer(server, options);
};

/**
 * Get popular servers
 */
export const getPopularServers = async (
  limit = 10
): Promise<MCPRegistryServer[]> => {
  const allServers = await getAllServers();
  return allServers
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};

/**
 * Get verified servers
 */
export const getVerifiedServers = async (): Promise<MCPRegistryServer[]> => {
  const allServers = await getAllServers();
  return allServers.filter((server) => server.verified);
};

/**
 * Get all categories with counts
 */
export const getCategoriesWithCounts = async (): Promise<
  Array<{ category: MCPServerCategory; count: number }>
> => {
  const allServers = await getAllServers();
  const counts = new Map<MCPServerCategory, number>();

  for (const server of allServers) {
    const current = counts.get(server.category) || 0;
    counts.set(server.category, current + 1);
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Refresh registry cache
 */
export const refreshRegistry = async (): Promise<void> => {
  await getAllServers(true);
};

/**
 * Clear registry cache
 */
export const clearRegistryCache = async (): Promise<void> => {
  registryCache = null;
  try {
    const cachePath = getCacheFilePath();
    const file = Bun.file(cachePath);
    if (await file.exists()) {
      await Bun.write(cachePath, "");
    }
  } catch {
    // Ignore
  }
};
