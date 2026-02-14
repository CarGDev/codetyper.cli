/**
 * MCP Manager - Manages multiple MCP server connections
 */

import fs from "fs/promises";
import path from "path";
import { MCPClient } from "@services/mcp/client";
import { DIRS, LOCAL_CONFIG_DIR } from "@constants/paths";
import type {
  MCPConfig,
  MCPServerConfig,
  MCPServerInstance,
  MCPToolDefinition,
  MCPToolCallResult,
} from "@/types/mcp";

/**
 * MCP Configuration file locations
 * Uses XDG-compliant paths from constants/paths.ts
 */
const CONFIG_LOCATIONS = {
  global: path.join(DIRS.config, "mcp.json"),
  local: path.join(process.cwd(), LOCAL_CONFIG_DIR, "mcp.json"),
};

/**
 * MCP Manager State
 */
interface MCPManagerState {
  clients: Map<string, MCPClient>;
  config: MCPConfig;
  initialized: boolean;
}

/**
 * MCP Manager singleton state
 */
const state: MCPManagerState = {
  clients: new Map(),
  config: { inputs: [], servers: {} },
  initialized: false,
};

/**
 * Load MCP configuration from file
 */
const loadConfigFile = async (filePath: string): Promise<MCPConfig | null> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as MCPConfig;
  } catch {
    return null;
  }
};

/**
 * Inject the runtime `name` field from the config key into each server entry.
 * Also normalises legacy `transport` field → `type`.
 */
const hydrateServerNames = (
  servers: Record<string, MCPServerConfig>,
): Record<string, MCPServerConfig> => {
  const hydrated: Record<string, MCPServerConfig> = {};
  for (const [key, cfg] of Object.entries(servers)) {
    // Normalise legacy `transport` → `type`
    const type = cfg.type ?? (cfg as Record<string, unknown>).transport as MCPServerConfig["type"];
    hydrated[key] = { ...cfg, name: key, type };
  }
  return hydrated;
};

/**
 * Build a clean server config object for disk persistence.
 * Strips the runtime-only `name` field so the JSON matches:
 *   { "servers": { "<name>": { "type": "http", "url": "..." } } }
 */
const toStorableConfig = (config: MCPServerConfig): Omit<MCPServerConfig, "name"> => {
  const { name: _name, ...rest } = config;
  // Remove undefined fields to keep JSON clean
  return Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  ) as Omit<MCPServerConfig, "name">;
};

/**
 * Load MCP configuration (merges global + local)
 */
export const loadMCPConfig = async (): Promise<MCPConfig> => {
  const globalConfig =
    (await loadConfigFile(CONFIG_LOCATIONS.global)) || { inputs: [], servers: {} };
  const localConfig =
    (await loadConfigFile(CONFIG_LOCATIONS.local)) || { inputs: [], servers: {} };

  const merged: MCPConfig = {
    inputs: [...(globalConfig?.inputs || []), ...(localConfig?.inputs || [])],
    servers: {
      ...hydrateServerNames(globalConfig?.servers || {}),
      ...hydrateServerNames(localConfig?.servers || {}),
    },
  };

  return merged;
};

/**
 * Save MCP configuration.
 * Strips runtime-only `name` fields from server entries before writing.
 */
export const saveMCPConfig = async (
  config: MCPConfig,
  global = false,
): Promise<void> => {
  const filePath = global ? CONFIG_LOCATIONS.global : CONFIG_LOCATIONS.local;
  const dir = path.dirname(filePath);

  // Strip runtime `name` from each server entry before persisting
  const cleanServers: Record<string, Omit<MCPServerConfig, "name">> = {};
  for (const [key, srv] of Object.entries(config.servers)) {
    cleanServers[key] = toStorableConfig(srv);
  }

  const output: MCPConfig = {
    inputs: config.inputs ?? [],
    servers: cleanServers as Record<string, MCPServerConfig>,
  };

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(output, null, 2), "utf-8");
};

/**
 * Initialize MCP Manager
 */
export const initializeMCP = async (): Promise<void> => {
  if (state.initialized) return;

  state.config = await loadMCPConfig();
  state.initialized = true;
};

/**
 * Connect to a specific MCP server
 */
export const connectServer = async (
  serverName: string,
): Promise<MCPServerInstance> => {
  await initializeMCP();

  const serverConfig = state.config.servers[serverName];
  if (!serverConfig) {
    throw new Error(`Server '${serverName}' not found in configuration`);
  }

  // Check if already connected
  let client = state.clients.get(serverName);
  if (client && client.getState() === "connected") {
    return client.getInstance();
  }

  // Create new client
  client = new MCPClient({
    ...serverConfig,
    name: serverName,
  });

  state.clients.set(serverName, client);

  await client.connect();
  return client.getInstance();
};

/**
 * Disconnect from a specific MCP server
 */
export const disconnectServer = async (serverName: string): Promise<void> => {
  const client = state.clients.get(serverName);
  if (client) {
    await client.disconnect();
    state.clients.delete(serverName);
  }
};

/**
 * Connect to all enabled servers
 */
export const connectAllServers = async (): Promise<
  Map<string, MCPServerInstance>
> => {
  await initializeMCP();

  const results = new Map<string, MCPServerInstance>();

  for (const [name, config] of Object.entries(state.config.servers)) {
    if (config.enabled === false) continue;

    try {
      const instance = await connectServer(name);
      results.set(name, instance);
    } catch (err) {
      results.set(name, {
        config: { ...config, name },
        state: "error",
        tools: [],
        resources: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
};

/**
 * Disconnect from all servers
 */
export const disconnectAllServers = async (): Promise<void> => {
  for (const [name] of state.clients) {
    await disconnectServer(name);
  }
};

/**
 * Get all server instances
 */
export const getServerInstances = (): Map<string, MCPServerInstance> => {
  const instances = new Map<string, MCPServerInstance>();

  for (const [name, client] of state.clients) {
    instances.set(name, client.getInstance());
  }

  // Include configured but not connected servers
  for (const [name, config] of Object.entries(state.config.servers)) {
    if (!instances.has(name)) {
      instances.set(name, {
        config: { ...config, name },
        state: "disconnected",
        tools: [],
        resources: [],
      });
    }
  }

  return instances;
};

/**
 * Get all available tools from all connected servers
 */
export const getAllTools = (): Array<{
  server: string;
  tool: MCPToolDefinition;
}> => {
  const tools: Array<{ server: string; tool: MCPToolDefinition }> = [];

  for (const [name, client] of state.clients) {
    if (client.getState() === "connected") {
      for (const tool of client.getTools()) {
        tools.push({ server: name, tool });
      }
    }
  }

  return tools;
};

/**
 * Call a tool on a specific server
 */
export const callTool = async (
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<MCPToolCallResult> => {
  const client = state.clients.get(serverName);
  if (!client) {
    return {
      success: false,
      error: `Server '${serverName}' not connected`,
    };
  }

  return client.callTool(toolName, args);
};

/**
 * Add a server to configuration
 */
export const addServer = async (
  name: string,
  config: Omit<MCPServerConfig, "name">,
  global = false,
): Promise<void> => {
  await initializeMCP();

  const targetConfig = global
    ? (await loadConfigFile(CONFIG_LOCATIONS.global)) || { inputs: [], servers: {} }
    : (await loadConfigFile(CONFIG_LOCATIONS.local)) || { inputs: [], servers: {} };

  if (targetConfig.servers[name]) {
    throw new Error(`Server '${name}' already exists`);
  }

  // Also check in-memory merged config for duplicates across scopes
  if (state.config.servers[name]) {
    throw new Error(`Server '${name}' already exists`);
  }

  // Store without the `name` field — the key is the name
  targetConfig.servers[name] = toStorableConfig(config as MCPServerConfig);

  await saveMCPConfig(targetConfig, global);

  // Update in-memory config with runtime name injected
  state.config.servers[name] = { ...config, name };
};

/**
 * Remove a server from configuration
 */
export const removeServer = async (
  name: string,
  global = false,
): Promise<void> => {
  await disconnectServer(name);

  const filePath = global ? CONFIG_LOCATIONS.global : CONFIG_LOCATIONS.local;
  const config = await loadConfigFile(filePath);

  if (config?.servers[name]) {
    delete config.servers[name];
    config.inputs = config.inputs || [];
    await saveMCPConfig(config, global);
  }

  delete state.config.servers[name];
};

/**
 * Get MCP configuration
 */
export const getMCPConfig = async (): Promise<MCPConfig> => {
  await initializeMCP();
  return state.config;
};

/**
 * Check if MCP is available (has any configured servers)
 */
export const isMCPAvailable = async (): Promise<boolean> => {
  await initializeMCP();
  return Object.keys(state.config.servers).length > 0;
};
