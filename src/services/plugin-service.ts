/**
 * Plugin Service
 *
 * Manages plugin lifecycle and provides access to plugin tools and commands
 */

import type {
  LoadedPlugin,
  PluginRegistry,
  PluginCommandDefinition,
  PluginLoadResult,
} from "@/types/plugin";
import type { FunctionDefinition, ToolDefinition } from "@tools/core/types";
import type { HookDefinition } from "@/types/hooks";
import {
  discoverPlugins,
  parseManifest,
  loadPluginTools,
  loadPluginCommands,
  loadPluginHooks,
} from "@services/plugin-loader";
import {
  PLUGIN_TOOL_SEPARATOR,
  PLUGIN_ERRORS,
} from "@constants/plugin";

/**
 * Plugin registry singleton
 */
const registry: PluginRegistry = {
  plugins: new Map(),
  tools: new Map(),
  commands: new Map(),
  initialized: false,
};

/**
 * Load a single plugin
 */
const loadPlugin = async (
  _name: string,
  path: string,
  manifestPath: string
): Promise<PluginLoadResult> => {
  const manifest = await parseManifest(manifestPath);

  if (!manifest) {
    return {
      success: false,
      error: PLUGIN_ERRORS.MANIFEST_INVALID,
    };
  }

  const [tools, commands, hooks] = await Promise.all([
    loadPluginTools(path, manifest),
    loadPluginCommands(path, manifest),
    loadPluginHooks(path, manifest),
  ]);

  const plugin: LoadedPlugin = {
    manifest,
    path,
    tools,
    commands,
    hooks,
    enabled: true,
  };

  return {
    success: true,
    plugin,
  };
};

/**
 * Initialize the plugin system
 */
export const initializePlugins = async (workingDir: string): Promise<void> => {
  if (registry.initialized) {
    return;
  }

  const discoveredPlugins = await discoverPlugins(workingDir);

  for (const discovered of discoveredPlugins) {
    const result = await loadPlugin(
      discovered.name,
      discovered.path,
      discovered.manifestPath
    );

    if (result.success && result.plugin) {
      registry.plugins.set(discovered.name, result.plugin);

      // Register tools with prefixed names
      for (const [toolName, toolDef] of result.plugin.tools) {
        const prefixedName = `${discovered.name}${PLUGIN_TOOL_SEPARATOR}${toolName}`;
        registry.tools.set(prefixedName, toolDef);
      }

      // Register commands
      for (const [cmdName, cmdDef] of result.plugin.commands) {
        registry.commands.set(cmdName, cmdDef);
      }
    }
  }

  registry.initialized = true;
};

/**
 * Refresh plugins (reload all)
 */
export const refreshPlugins = async (workingDir: string): Promise<void> => {
  registry.plugins.clear();
  registry.tools.clear();
  registry.commands.clear();
  registry.initialized = false;

  await initializePlugins(workingDir);
};

/**
 * Check if a tool is a plugin tool
 */
export const isPluginTool = (name: string): boolean => {
  return registry.tools.has(name);
};

/**
 * Get a plugin tool by name
 */
export const getPluginTool = (name: string): ToolDefinition | undefined => {
  const pluginTool = registry.tools.get(name);

  if (!pluginTool) {
    return undefined;
  }

  return pluginTool as unknown as ToolDefinition;
};

/**
 * Get all plugin tools for API
 */
export const getPluginToolsForApi = (): {
  type: "function";
  function: FunctionDefinition;
}[] => {
  const tools: {
    type: "function";
    function: FunctionDefinition;
  }[] = [];

  for (const [name, tool] of registry.tools) {
    tools.push({
      type: "function",
      function: {
        name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: {},
        },
      },
    });
  }

  return tools;
};

/**
 * Get a plugin command by name
 */
export const getPluginCommand = (
  name: string
): PluginCommandDefinition | undefined => {
  return registry.commands.get(name);
};

/**
 * Check if a command is a plugin command
 */
export const isPluginCommand = (name: string): boolean => {
  return registry.commands.has(name);
};

/**
 * Get all plugin commands
 */
export const getAllPluginCommands = (): PluginCommandDefinition[] => {
  return Array.from(registry.commands.values());
};

/**
 * Get all plugin hooks
 */
export const getAllPluginHooks = (): HookDefinition[] => {
  const hooks: HookDefinition[] = [];

  for (const plugin of registry.plugins.values()) {
    if (plugin.enabled) {
      hooks.push(...plugin.hooks);
    }
  }

  return hooks;
};

/**
 * Get all loaded plugins
 */
export const getAllPlugins = (): LoadedPlugin[] => {
  return Array.from(registry.plugins.values());
};

/**
 * Get a specific plugin by name
 */
export const getPlugin = (name: string): LoadedPlugin | undefined => {
  return registry.plugins.get(name);
};

/**
 * Enable a plugin
 */
export const enablePlugin = (name: string): boolean => {
  const plugin = registry.plugins.get(name);

  if (!plugin) {
    return false;
  }

  plugin.enabled = true;
  return true;
};

/**
 * Disable a plugin
 */
export const disablePlugin = (name: string): boolean => {
  const plugin = registry.plugins.get(name);

  if (!plugin) {
    return false;
  }

  plugin.enabled = false;
  return true;
};

/**
 * Check if plugins are initialized
 */
export const isPluginsInitialized = (): boolean => {
  return registry.initialized;
};

/**
 * Get plugin count
 */
export const getPluginCount = (): number => {
  return registry.plugins.size;
};

/**
 * Get plugin tool count
 */
export const getPluginToolCount = (): number => {
  return registry.tools.size;
};

/**
 * Get plugin command count
 */
export const getPluginCommandCount = (): number => {
  return registry.commands.size;
};
