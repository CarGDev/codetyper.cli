/**
 * MCP Tools Integration
 *
 * Wraps MCP tools to work with the codetyper tool system.
 */

import { z } from "zod";
import {
  getAllTools,
  callTool,
  connectAllServers,
} from "@services/mcp/manager";
import type { MCPToolDefinition } from "@/types/mcp";

/**
 * Tool definition compatible with codetyper's tool system
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (
    args: Record<string, unknown>,
    ctx: unknown,
  ) => Promise<{
    success: boolean;
    output: string;
    error?: string;
    title: string;
  }>;
}

/**
 * Convert JSON Schema to Zod schema (simplified)
 */
const jsonSchemaToZod = (
  _schema: MCPToolDefinition["inputSchema"],
): z.ZodSchema => {
  // Create a passthrough object schema that accepts any properties
  // In a full implementation, we'd parse the JSON Schema properly
  return z.object({}).passthrough();
};

/**
 * Create a codetyper tool from an MCP tool definition
 */
const createToolFromMCP = (
  serverName: string,
  mcpTool: MCPToolDefinition,
): ToolDefinition => {
  const fullName = `mcp_${serverName}_${mcpTool.name}`;

  return {
    name: fullName,
    description:
      mcpTool.description || `MCP tool: ${mcpTool.name} from ${serverName}`,
    parameters: jsonSchemaToZod(mcpTool.inputSchema),
    execute: async (args) => {
      const result = await callTool(serverName, mcpTool.name, args);

      if (result.success) {
        return {
          success: true,
          output:
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content, null, 2),
          title: `${serverName}/${mcpTool.name}`,
        };
      }

      return {
        success: false,
        output: "",
        error: result.error || "Unknown error",
        title: `${serverName}/${mcpTool.name}`,
      };
    },
  };
};

/**
 * Get all MCP tools as codetyper tool definitions
 */
export const getMCPTools = async (): Promise<ToolDefinition[]> => {
  // Ensure servers are connected
  await connectAllServers();

  const mcpTools = getAllTools();

  return mcpTools.map(({ server, tool }) => createToolFromMCP(server, tool));
};

/**
 * Get MCP tools for API (OpenAI function format)
 */
export const getMCPToolsForApi = async (): Promise<
  Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
      };
    };
  }>
> => {
  await connectAllServers();

  const mcpTools = getAllTools();

  return mcpTools.map(({ server, tool }) => ({
    type: "function" as const,
    function: {
      name: `mcp_${server}_${tool.name}`,
      description: tool.description || `MCP tool: ${tool.name} from ${server}`,
      parameters: {
        type: "object" as const,
        properties: tool.inputSchema.properties || {},
        required: tool.inputSchema.required,
      },
    },
  }));
};

/**
 * Execute an MCP tool by full name (mcp_server_toolname)
 */
export const executeMCPTool = async (
  fullName: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; output: string; error?: string }> => {
  // Parse the full name: mcp_servername_toolname
  const match = fullName.match(/^mcp_([^_]+)_(.+)$/);
  if (!match) {
    return {
      success: false,
      output: "",
      error: `Invalid MCP tool name: ${fullName}`,
    };
  }

  const [, serverName, toolName] = match;
  const result = await callTool(serverName, toolName, args);

  if (result.success) {
    return {
      success: true,
      output:
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content, null, 2),
    };
  }

  return {
    success: false,
    output: "",
    error: result.error,
  };
};

/**
 * Check if a tool name is an MCP tool
 */
export const isMCPTool = (toolName: string): boolean => {
  return toolName.startsWith("mcp_");
};
