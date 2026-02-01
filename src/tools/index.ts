/**
 * Tool registry - exports all available tools
 */

export * from "@tools/types";
export { bashTool } from "@tools/bash";
export { readTool } from "@tools/read";
export { writeTool } from "@tools/write";
export { editTool } from "@tools/edit";
export { todoWriteTool } from "@tools/todo-write";
export { todoReadTool } from "@tools/todo-read";
export { globToolDefinition } from "@tools/glob/definition";
export { grepToolDefinition } from "@tools/grep/definition";

import type { ToolDefinition, FunctionDefinition } from "@tools/types";
import { toolToFunction } from "@tools/types";
import { bashTool } from "@tools/bash";
import { readTool } from "@tools/read";
import { writeTool } from "@tools/write";
import { editTool } from "@tools/edit";
import { todoWriteTool } from "@tools/todo-write";
import { todoReadTool } from "@tools/todo-read";
import { globToolDefinition } from "@tools/glob/definition";
import { grepToolDefinition } from "@tools/grep/definition";
import {
  isMCPTool,
  executeMCPTool,
  getMCPToolsForApi,
} from "@services/mcp/tools";
import { z } from "zod";

// All available tools
export const tools: ToolDefinition[] = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  globToolDefinition,
  grepToolDefinition,
  todoWriteTool,
  todoReadTool,
];

// Tools that are read-only (allowed in chat mode)
const READ_ONLY_TOOLS = new Set([
  "read",
  "glob",
  "grep",
  "todo_read",
]);

// Map of tools by name
export const toolMap: Map<string, ToolDefinition> = new Map(
  tools.map((t) => [t.name, t]),
);

// Cached MCP tools
let mcpToolsCache: Awaited<ReturnType<typeof getMCPToolsForApi>> | null = null;

/**
 * Get tool by name (including MCP tools)
 */
export function getTool(name: string): ToolDefinition | undefined {
  // Check built-in tools first
  const builtInTool = toolMap.get(name);
  if (builtInTool) {
    return builtInTool;
  }

  // Check if it's an MCP tool
  if (isMCPTool(name)) {
    // Return a wrapper tool definition for MCP tools
    return {
      name,
      description: `MCP tool: ${name}`,
      parameters: z.object({}).passthrough(),
      execute: async (args) => {
        const result = await executeMCPTool(
          name,
          args as Record<string, unknown>,
        );
        return {
          success: result.success,
          title: name,
          output: result.output,
          error: result.error,
        };
      },
    };
  }

  return undefined;
}

// Get all tools as OpenAI function definitions
export function getToolFunctions(): FunctionDefinition[] {
  return tools.map(toolToFunction);
}

/**
 * Filter tools based on chat mode (read-only vs full access)
 */
const filterToolsForMode = (
  toolList: ToolDefinition[],
  chatMode: boolean,
): ToolDefinition[] => {
  if (!chatMode) return toolList;
  return toolList.filter((t) => READ_ONLY_TOOLS.has(t.name));
};

/**
 * Get tools as format expected by Copilot/OpenAI API
 * This includes both built-in tools and MCP tools
 * @param chatMode - If true, only return read-only tools (no file modifications)
 */
export async function getToolsForApiAsync(
  chatMode = false,
): Promise<
  {
    type: "function";
    function: FunctionDefinition;
  }[]
> {
  const filteredTools = filterToolsForMode(tools, chatMode);
  const builtInTools = filteredTools.map((t) => ({
    type: "function" as const,
    function: toolToFunction(t),
  }));

  // In chat mode, don't include MCP tools (they might modify files)
  if (chatMode) {
    return builtInTools;
  }

  // Get MCP tools (uses cache if available)
  try {
    mcpToolsCache = await getMCPToolsForApi();
    return [...builtInTools, ...mcpToolsCache];
  } catch {
    // If MCP tools fail to load, just return built-in tools
    return builtInTools;
  }
}

/**
 * Get tools synchronously (uses cached MCP tools if available)
 * @param chatMode - If true, only return read-only tools (no file modifications)
 */
export function getToolsForApi(
  chatMode = false,
): {
  type: "function";
  function: FunctionDefinition;
}[] {
  const filteredTools = filterToolsForMode(tools, chatMode);
  const builtInTools = filteredTools.map((t) => ({
    type: "function" as const,
    function: toolToFunction(t),
  }));

  // In chat mode, don't include MCP tools
  if (chatMode) {
    return builtInTools;
  }

  // Include cached MCP tools if available
  if (mcpToolsCache) {
    return [...builtInTools, ...mcpToolsCache];
  }

  return builtInTools;
}

/**
 * Refresh MCP tools cache
 * Returns information about the refresh result for logging
 */
export async function refreshMCPTools(): Promise<{
  success: boolean;
  toolCount: number;
  error?: string;
}> {
  try {
    mcpToolsCache = await getMCPToolsForApi();
    return {
      success: true,
      toolCount: mcpToolsCache.length,
    };
  } catch (err) {
    mcpToolsCache = null;
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      toolCount: 0,
      error: errorMessage,
    };
  }
}
