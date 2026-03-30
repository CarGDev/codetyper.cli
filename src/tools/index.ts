import type { ToolDefinition, FunctionDefinition } from "@tools/core/types";
import { toolToFunction } from "@tools/core/types";
import type { ToolFilterProfile } from "@constants/tools";
import { TOOL_FILTER_PROFILES } from "@constants/tools";
import { bashTool } from "@tools/bash";
import { readTool } from "@tools/read";
import { writeTool } from "@tools/write";
import { editTool } from "@tools/edit";
import { todoWriteTool } from "@tools/todo-write";
import { todoReadTool } from "@tools/todo-read";
import { globToolDefinition } from "@tools/glob/definition";
import { grepToolDefinition } from "@tools/grep/definition";
import { webSearchTool } from "@tools/web-search";
import { webFetchTool } from "@tools/web-fetch/execute";
import { multiEditTool } from "@tools/multi-edit/execute";
import { lspTool } from "@tools/lsp";
import { applyPatchTool } from "@tools/apply-patch";
import { taskAgentTool } from "@tools/task-agent/execute";
import { planApprovalTool } from "@tools/plan-approval/execute";
import { askUserTool } from "@tools/ask-user/execute";
import {
  isMCPTool,
  executeMCPTool,
  getMCPToolsForApi,
} from "@services/mcp/tools";
import {
  isPluginTool,
  getPluginTool,
  getPluginToolsForApi,
} from "@services/plugin-service";
import { z } from "zod";

// All available tools
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
  taskAgentTool,
  planApprovalTool,
  askUserTool,
];



// Cache for filtered tool definitions keyed by profile name
const toolDefsCache = new Map<string, { type: "function"; function: FunctionDefinition }[]>();
let mcpToolsCacheVersion = 0;

// Map of tools by name
export const toolMap: Map<string, ToolDefinition> = new Map(
  tools.map((t) => [t.name, t]),
);

// Cached MCP tools
let mcpToolsCache: Awaited<ReturnType<typeof getMCPToolsForApi>> | null = null;

/**
 * Get tool by name (including MCP tools and plugin tools)
 */
export function getTool(name: string): ToolDefinition | undefined {
  // Check built-in tools first
  const builtInTool = toolMap.get(name);
  if (builtInTool) {
    return builtInTool;
  }

  // Check if it's a plugin tool
  if (isPluginTool(name)) {
    return getPluginTool(name);
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
 * Filter tools based on profile or chat mode
 */
const filterTools = (
  toolList: ToolDefinition[],
  profile: ToolFilterProfile,
): ToolDefinition[] => {
  const allowedNames = TOOL_FILTER_PROFILES[profile];
  return toolList.filter((t) => allowedNames.has(t.name));
};

/**
 * Resolve which profile to use based on options
 */
const resolveProfile = (
  chatMode: boolean,
  profile?: ToolFilterProfile,
): ToolFilterProfile => {
  if (profile) return profile;
  if (chatMode) return "chat";
  return "full";
};

/**
 * Get tools as format expected by Copilot/OpenAI API
 * This includes both built-in tools and MCP tools
 * @param chatMode - If true, only return read-only tools (no file modifications)
 * @param profile - Tool filter profile to limit which tools are sent
 */
export async function getToolsForApiAsync(
  chatMode = false,
  profile?: ToolFilterProfile,
): Promise<{ type: "function"; function: FunctionDefinition }[]> {
  const resolved = resolveProfile(chatMode, profile);
  const filteredTools = filterTools(tools, resolved);
  const builtInTools = filteredTools.map((t) => ({
    type: "function" as const,
    function: toolToFunction(t),
  }));

  // Read-only profiles don't include MCP/plugin tools
  if (resolved === "chat" || resolved === "explore" || resolved === "review") {
    return builtInTools;
  }

  // Get MCP tools and plugin tools
  try {
    mcpToolsCache = await getMCPToolsForApi();
    mcpToolsCacheVersion++;
    toolDefsCache.clear(); // Invalidate cache when MCP tools change
    const pluginTools = getPluginToolsForApi();
    return [...builtInTools, ...pluginTools, ...mcpToolsCache];
  } catch {
    const pluginTools = getPluginToolsForApi();
    return [...builtInTools, ...pluginTools];
  }
}

/**
 * Get tools synchronously (uses cached MCP tools if available)
 * Results are cached per profile to avoid re-serialization every request.
 * @param chatMode - If true, only return read-only tools (no file modifications)
 * @param profile - Tool filter profile to limit which tools are sent
 */
export function getToolsForApi(
  chatMode = false,
  profile?: ToolFilterProfile,
): { type: "function"; function: FunctionDefinition }[] {
  const resolved = resolveProfile(chatMode, profile);
  const cacheKey = `${resolved}_${mcpToolsCacheVersion}`;

  // Return cached result if available
  const cached = toolDefsCache.get(cacheKey);
  if (cached) return cached;

  const filteredTools = filterTools(tools, resolved);
  const builtInTools = filteredTools.map((t) => ({
    type: "function" as const,
    function: toolToFunction(t),
  }));

  // Read-only profiles don't include MCP/plugin tools
  if (resolved === "chat" || resolved === "explore" || resolved === "review") {
    toolDefsCache.set(cacheKey, builtInTools);
    return builtInTools;
  }

  const pluginTools = getPluginToolsForApi();
  const result = mcpToolsCache
    ? [...builtInTools, ...pluginTools, ...mcpToolsCache]
    : [...builtInTools, ...pluginTools];

  toolDefsCache.set(cacheKey, result);
  return result;
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
    mcpToolsCacheVersion++;
    toolDefsCache.clear(); // Invalidate on refresh
    return {
      success: true,
      toolCount: mcpToolsCache.length,
    };
  } catch (err) {
    mcpToolsCache = null;
    mcpToolsCacheVersion++;
    toolDefsCache.clear();
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      toolCount: 0,
      error: errorMessage,
    };
  }
}
