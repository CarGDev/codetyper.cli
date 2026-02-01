/**
 * Plugin System Constants
 *
 * Constants for the plugin architecture
 */

import type { PluginCapability } from "@/types/plugin";

/**
 * Plugin directory name
 */
export const PLUGINS_DIR = "plugins";

/**
 * Plugin manifest file name
 */
export const PLUGIN_MANIFEST_FILE = "plugin.json";

/**
 * Plugin subdirectories
 */
export const PLUGIN_SUBDIRS = {
  tools: "tools",
  commands: "commands",
  hooks: "hooks",
} as const;

/**
 * Plugin tool name prefix separator
 */
export const PLUGIN_TOOL_SEPARATOR = ":";

/**
 * Maximum plugin load timeout in milliseconds
 */
export const PLUGIN_LOAD_TIMEOUT = 5000;

/**
 * Maximum number of plugins to load
 */
export const MAX_PLUGINS = 50;

/**
 * Default plugin capabilities
 */
export const DEFAULT_PLUGIN_CAPABILITIES: PluginCapability[] = [];

/**
 * All available plugin capabilities
 */
export const ALL_PLUGIN_CAPABILITIES: PluginCapability[] = [
  "filesystem",
  "network",
  "shell",
  "mcp",
];

/**
 * Plugin capability labels
 */
export const PLUGIN_CAPABILITY_LABELS: Record<PluginCapability, string> = {
  filesystem: "File System Access",
  network: "Network Access",
  shell: "Shell Execution",
  mcp: "MCP Integration",
};

/**
 * Plugin capability descriptions
 */
export const PLUGIN_CAPABILITY_DESCRIPTIONS: Record<PluginCapability, string> = {
  filesystem: "Can read and write files on disk",
  network: "Can make network requests",
  shell: "Can execute shell commands",
  mcp: "Can interact with MCP servers",
};

/**
 * Command file extension
 */
export const COMMAND_FILE_EXTENSION = ".md";

/**
 * Tool file extension
 */
export const TOOL_FILE_EXTENSION = ".ts";

/**
 * Hook script extensions
 */
export const HOOK_SCRIPT_EXTENSIONS = [".sh", ".bash"];

/**
 * Command frontmatter delimiter
 */
export const COMMAND_FRONTMATTER_DELIMITER = "---";

/**
 * Plugin load errors
 */
export const PLUGIN_ERRORS = {
  MANIFEST_NOT_FOUND: "Plugin manifest not found",
  MANIFEST_INVALID: "Plugin manifest is invalid",
  TOOL_LOAD_FAILED: "Failed to load tool",
  COMMAND_LOAD_FAILED: "Failed to load command",
  HOOK_LOAD_FAILED: "Failed to load hook",
  DUPLICATE_TOOL: "Tool name already exists",
  DUPLICATE_COMMAND: "Command name already exists",
} as const;
