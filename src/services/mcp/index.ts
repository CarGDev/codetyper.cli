/**
 * MCP Service - Model Context Protocol integration
 *
 * Provides connectivity to MCP servers for extensible tool integration.
 */

export { MCPClient } from "@services/mcp/client";

export {
  initializeMCP,
  loadMCPConfig,
  saveMCPConfig,
  connectServer,
  disconnectServer,
  connectAllServers,
  disconnectAllServers,
  getServerInstances,
  getAllTools,
  callTool,
  addServer,
  removeServer,
  getMCPConfig,
  isMCPAvailable,
} from "@services/mcp/manager";

export type {
  MCPConfig,
  MCPServerConfig,
  MCPServerInstance,
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPToolCallRequest,
  MCPToolCallResult,
  MCPConnectionState,
  MCPTransportType,
  MCPManagerState,
} from "@/types/mcp";
