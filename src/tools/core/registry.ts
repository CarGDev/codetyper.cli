/**
 * Tool Registry
 *
 * Central registry for all available tools with support for
 * built-in tools, MCP tools, and plugin tools.
 */

import type { ToolDefinition, FunctionDefinition } from "@tools/core/types";
import { toolToFunction } from "@tools/core/types";
import { bashTool } from "@/tools/bash";
import { readTool } from "@/tools/read";
import { writeTool } from "@/tools/write";
import { editTool } from "@/tools/edit";
import { todoWriteTool } from "@/tools/todo-write";
import { todoReadTool } from "@/tools/todo-read";
import { globToolDefinition } from "@/tools/glob/definition";
import { grepToolDefinition } from "@/tools/grep/definition";
import { webSearchTool } from "@/tools/web-search";
import { webFetchTool } from "@/tools/web-fetch";
import { multiEditTool } from "@/tools/multi-edit";
import { lspTool } from "@/tools/lsp";
import { applyPatchTool } from "@/tools/apply-patch";
import {
  isMCPTool,
  executeMCPTool,
  getMCPToolsForApi,
} from "@/services/mcp/tools";
import {
  isPluginTool,
  getPluginTool,
  getPluginToolsForApi,
} from "@/services/plugin-service";
import { z } from "zod";

/**
 * All built-in tools
 */
export const tools: ToolDefinition[] = [
  bashTool,
  readTool,
  writeTool,
  editTool,
  multiEditTool,
  globToolDefinition,
  grepToolDefinition,
  todoWriteTool,
  todoReadTool,
  webSearchTool,
  webFetchTool,
  lspTool,
  applyPatchTool,
];

/**
 * Tools that are read-only (allowed in chat mode)
 */
const READ_ONLY_TOOLS = new Set([
  "read",
  "glob",
  "grep",
  "todo_read",
  "web_search",
  "web_fetch",
  "lsp",
]);

/**
 * Map of tools by name for fast lookup
 */
export const toolMap: Map<string, ToolDefinition> = new Map(
  tools.map((t) => [t.name, t]),
);

/**
 * Cached MCP tools
 */
let mcpToolsCache: Awaited<ReturnType<typeof getMCPToolsForApi>> | null = null;

/**
 * Get tool by name (including MCP tools and plugin tools)
 */
export const getTool = (name: string): ToolDefinition | undefined => {
  const builtInTool = toolMap.get(name);
  if (builtInTool) {
    return builtInTool;
  }

  if (isPluginTool(name)) {
    return getPluginTool(name);
  }

  if (isMCPTool(name)) {
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
};

/**
 * Get all tools as OpenAI function definitions
 */
export const getToolFunctions = (): FunctionDefinition[] => {
  return tools.map(toolToFunction);
};

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
export const getToolsForApiAsync = async (
  chatMode = false,
): Promise<
  {
    type: "function";
    function: FunctionDefinition;
  }[]
> => {
  const filteredTools = filterToolsForMode(tools, chatMode);
  const builtInTools = filteredTools.map((t) => ({
    type: "function" as const,
    function: toolToFunction(t),
  }));

  if (chatMode) {
    return builtInTools;
  }

  try {
    mcpToolsCache = await getMCPToolsForApi();
    const pluginTools = getPluginToolsForApi();
    return [...builtInTools, ...pluginTools, ...mcpToolsCache];
  } catch {
    const pluginTools = getPluginToolsForApi();
    return [...builtInTools, ...pluginTools];
  }
};

/**
 * Get tools synchronously (uses cached MCP tools if available)
 * @param chatMode - If true, only return read-only tools (no file modifications)
 */
export const getToolsForApi = (
  chatMode = false,
): {
  type: "function";
  function: FunctionDefinition;
}[] => {
  const filteredTools = filterToolsForMode(tools, chatMode);
  const builtInTools = filteredTools.map((t) => ({
    type: "function" as const,
    function: toolToFunction(t),
  }));

  if (chatMode) {
    return builtInTools;
  }

  const pluginTools = getPluginToolsForApi();

  if (mcpToolsCache) {
    return [...builtInTools, ...pluginTools, ...mcpToolsCache];
  }

  return [...builtInTools, ...pluginTools];
};

/**
 * Refresh MCP tools cache
 * Returns information about the refresh result for logging
 */
export const refreshMCPTools = async (): Promise<{
  success: boolean;
  toolCount: number;
  error?: string;
}> => {
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
};
