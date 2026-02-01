/**
 * Plugin System Type Definitions
 *
 * Types for the plugin architecture
 */

import type { z } from "zod";
import type { ToolResult, ToolContext } from "@/types/tools";
import type { HookDefinition } from "@/types/hooks";

/**
 * Plugin manifest structure
 */
export interface PluginManifest {
  /** Plugin name (must match directory name) */
  name: string;
  /** Plugin version */
  version: string;
  /** Optional description */
  description?: string;
  /** Optional author */
  author?: string;
  /** Custom tools provided by this plugin */
  tools?: PluginToolReference[];
  /** Custom commands (slash commands) */
  commands?: PluginCommandReference[];
  /** Plugin-specific hooks */
  hooks?: PluginHookReference[];
  /** Required capabilities */
  capabilities?: PluginCapability[];
}

/**
 * Reference to a tool in the manifest
 */
export interface PluginToolReference {
  /** Tool name */
  name: string;
  /** Path to tool file (relative to plugin directory) */
  file: string;
}

/**
 * Reference to a command in the manifest
 */
export interface PluginCommandReference {
  /** Command name (without leading /) */
  name: string;
  /** Path to command file (relative to plugin directory) */
  file: string;
}

/**
 * Reference to a hook in the manifest
 */
export interface PluginHookReference {
  /** Hook event type */
  event: string;
  /** Path to hook script (relative to plugin directory) */
  script: string;
  /** Optional timeout */
  timeout?: number;
}

/**
 * Plugin capabilities
 */
export type PluginCapability =
  | "filesystem"
  | "network"
  | "shell"
  | "mcp";

/**
 * Tool definition from a plugin
 */
export interface PluginToolDefinition<T = unknown> {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Zod schema for parameters */
  parameters: z.ZodType<T>;
  /** Tool execution function */
  execute: (args: T, ctx: ToolContext) => Promise<ToolResult>;
}

/**
 * Command definition from a plugin
 */
export interface PluginCommandDefinition {
  /** Command name (without leading /) */
  name: string;
  /** Command description */
  description: string;
  /** Command prompt template or content */
  prompt: string;
  /** Optional arguments schema */
  args?: Record<string, PluginCommandArg>;
}

/**
 * Command argument definition
 */
export interface PluginCommandArg {
  /** Argument description */
  description: string;
  /** Whether argument is required */
  required?: boolean;
  /** Default value */
  default?: string;
}

/**
 * Loaded plugin
 */
export interface LoadedPlugin {
  /** Plugin manifest */
  manifest: PluginManifest;
  /** Plugin directory path */
  path: string;
  /** Loaded tools */
  tools: Map<string, PluginToolDefinition>;
  /** Loaded commands */
  commands: Map<string, PluginCommandDefinition>;
  /** Loaded hooks */
  hooks: HookDefinition[];
  /** Whether plugin is enabled */
  enabled: boolean;
  /** Load error if any */
  error?: string;
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: LoadedPlugin;
  error?: string;
}

/**
 * Plugin registry state
 */
export interface PluginRegistry {
  /** All loaded plugins by name */
  plugins: Map<string, LoadedPlugin>;
  /** All plugin tools by name (prefixed with plugin name) */
  tools: Map<string, PluginToolDefinition>;
  /** All plugin commands by name */
  commands: Map<string, PluginCommandDefinition>;
  /** Whether registry is initialized */
  initialized: boolean;
}

/**
 * Plugin tool execution context
 */
export interface PluginToolContext extends ToolContext {
  /** Plugin name */
  pluginName: string;
  /** Plugin directory path */
  pluginPath: string;
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
  /** Plugin name */
  name: string;
  /** Plugin path */
  path: string;
  /** Manifest path */
  manifestPath: string;
}
