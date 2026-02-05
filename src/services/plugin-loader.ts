/**
 * Plugin Loader Service
 *
 * Discovers and parses plugin manifests and files
 */

import { readdir, readFile, access, constants, stat } from "fs/promises";
import { join, extname, basename } from "path";
import type {
  PluginManifest,
  PluginDiscoveryResult,
  PluginToolDefinition,
  PluginCommandDefinition,
} from "@/types/plugin";
import type { HookDefinition } from "@/types/hooks";
import {
  PLUGINS_DIR,
  PLUGIN_MANIFEST_FILE,
  PLUGIN_SUBDIRS,
  COMMAND_FILE_EXTENSION,
  COMMAND_FRONTMATTER_DELIMITER,
  HOOK_SCRIPT_EXTENSIONS,
  MAX_PLUGINS,
} from "@constants/plugin";
import { DIRS, LOCAL_CONFIG_DIR } from "@constants/paths";

/**
 * Discover plugins in a directory
 */
const discoverPluginsInDir = async (
  baseDir: string,
): Promise<PluginDiscoveryResult[]> => {
  const pluginsPath = join(baseDir, PLUGINS_DIR);
  const results: PluginDiscoveryResult[] = [];

  try {
    await access(pluginsPath, constants.R_OK);
    const entries = await readdir(pluginsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (results.length >= MAX_PLUGINS) break;

      const pluginPath = join(pluginsPath, entry.name);
      const manifestPath = join(pluginPath, PLUGIN_MANIFEST_FILE);

      try {
        await access(manifestPath, constants.R_OK);
        results.push({
          name: entry.name,
          path: pluginPath,
          manifestPath,
        });
      } catch {
        // No manifest, skip this directory
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return results;
};

/**
 * Discover all plugins from global and local directories
 */
export const discoverPlugins = async (
  workingDir: string,
): Promise<PluginDiscoveryResult[]> => {
  const [globalPlugins, localPlugins] = await Promise.all([
    discoverPluginsInDir(DIRS.config),
    discoverPluginsInDir(join(workingDir, LOCAL_CONFIG_DIR)),
  ]);

  // Local plugins override global ones with same name
  const pluginMap = new Map<string, PluginDiscoveryResult>();

  for (const plugin of globalPlugins) {
    pluginMap.set(plugin.name, plugin);
  }

  for (const plugin of localPlugins) {
    pluginMap.set(plugin.name, plugin);
  }

  return Array.from(pluginMap.values());
};

/**
 * Parse plugin manifest
 */
export const parseManifest = async (
  manifestPath: string,
): Promise<PluginManifest | null> => {
  try {
    const content = await readFile(manifestPath, "utf-8");
    const manifest: PluginManifest = JSON.parse(content);

    // Validate required fields
    if (!manifest.name || !manifest.version) {
      return null;
    }

    return manifest;
  } catch {
    return null;
  }
};

/**
 * Parse command file with frontmatter
 */
export const parseCommandFile = async (
  filePath: string,
): Promise<PluginCommandDefinition | null> => {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    // Check for frontmatter
    if (lines[0]?.trim() !== COMMAND_FRONTMATTER_DELIMITER) {
      // No frontmatter, treat entire content as prompt
      const name = basename(filePath, COMMAND_FILE_EXTENSION);
      return {
        name,
        description: `Custom command: ${name}`,
        prompt: content,
      };
    }

    // Find closing frontmatter delimiter
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === COMMAND_FRONTMATTER_DELIMITER) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      // Malformed frontmatter
      return null;
    }

    // Parse frontmatter as YAML-like key-value pairs
    const frontmatterLines = lines.slice(1, endIndex);
    const frontmatter: Record<string, string> = {};

    for (const line of frontmatterLines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }

    // Rest is the prompt
    const prompt = lines
      .slice(endIndex + 1)
      .join("\n")
      .trim();

    const name = frontmatter.name || basename(filePath, COMMAND_FILE_EXTENSION);
    const description = frontmatter.description || `Custom command: ${name}`;

    return {
      name,
      description,
      prompt,
    };
  } catch {
    return null;
  }
};

/**
 * Load tool module dynamically
 */
export const loadToolModule = async (
  filePath: string,
): Promise<PluginToolDefinition | null> => {
  try {
    // For Bun, we can use dynamic import
    const module = await import(filePath);
    const toolDef = module.default || module;

    // Validate tool definition
    if (
      !toolDef.name ||
      !toolDef.description ||
      !toolDef.parameters ||
      !toolDef.execute
    ) {
      return null;
    }

    return toolDef as PluginToolDefinition;
  } catch {
    return null;
  }
};

/**
 * Load hooks from plugin hooks directory
 */
export const loadPluginHooks = async (
  pluginPath: string,
  manifest: PluginManifest,
): Promise<HookDefinition[]> => {
  const hooks: HookDefinition[] = [];

  // Load hooks from manifest
  if (manifest.hooks) {
    for (const hookRef of manifest.hooks) {
      const scriptPath = join(pluginPath, PLUGIN_SUBDIRS.hooks, hookRef.script);

      try {
        await access(scriptPath, constants.X_OK);
        hooks.push({
          event: hookRef.event as HookDefinition["event"],
          script: scriptPath,
          timeout: hookRef.timeout,
          name: `${manifest.name}:${hookRef.event}`,
        });
      } catch {
        // Script not found or not executable
      }
    }
  }

  // Also discover hooks by convention
  const hooksDir = join(pluginPath, PLUGIN_SUBDIRS.hooks);

  try {
    await access(hooksDir, constants.R_OK);
    const entries = await readdir(hooksDir);

    for (const entry of entries) {
      const ext = extname(entry);
      if (!HOOK_SCRIPT_EXTENSIONS.includes(ext)) continue;

      const scriptPath = join(hooksDir, entry);
      const scriptStat = await stat(scriptPath);

      if (!scriptStat.isFile()) continue;

      // Try to determine event type from filename
      const baseName = basename(entry, ext);
      const eventTypes = [
        "PreToolUse",
        "PostToolUse",
        "SessionStart",
        "SessionEnd",
        "UserPromptSubmit",
        "Stop",
      ];

      for (const eventType of eventTypes) {
        if (baseName.toLowerCase().includes(eventType.toLowerCase())) {
          // Check if already added from manifest
          const alreadyAdded = hooks.some(
            (h) => h.script === scriptPath && h.event === eventType,
          );

          if (!alreadyAdded) {
            hooks.push({
              event: eventType as HookDefinition["event"],
              script: scriptPath,
              name: `${manifest.name}:${baseName}`,
            });
          }
          break;
        }
      }
    }
  } catch {
    // Hooks directory doesn't exist
  }

  return hooks;
};

/**
 * Load commands from plugin commands directory
 */
export const loadPluginCommands = async (
  pluginPath: string,
  manifest: PluginManifest,
): Promise<Map<string, PluginCommandDefinition>> => {
  const commands = new Map<string, PluginCommandDefinition>();

  // Load commands from manifest
  if (manifest.commands) {
    for (const cmdRef of manifest.commands) {
      const cmdPath = join(pluginPath, PLUGIN_SUBDIRS.commands, cmdRef.file);
      const cmdDef = await parseCommandFile(cmdPath);

      if (cmdDef) {
        cmdDef.name = cmdRef.name; // Override with manifest name
        commands.set(cmdRef.name, cmdDef);
      }
    }
  }

  // Also discover commands by convention
  const commandsDir = join(pluginPath, PLUGIN_SUBDIRS.commands);

  try {
    await access(commandsDir, constants.R_OK);
    const entries = await readdir(commandsDir);

    for (const entry of entries) {
      if (extname(entry) !== COMMAND_FILE_EXTENSION) continue;

      const cmdPath = join(commandsDir, entry);
      const cmdStat = await stat(cmdPath);

      if (!cmdStat.isFile()) continue;

      const cmdDef = await parseCommandFile(cmdPath);

      if (cmdDef && !commands.has(cmdDef.name)) {
        commands.set(cmdDef.name, cmdDef);
      }
    }
  } catch {
    // Commands directory doesn't exist
  }

  return commands;
};

/**
 * Load tools from plugin tools directory
 */
export const loadPluginTools = async (
  pluginPath: string,
  manifest: PluginManifest,
): Promise<Map<string, PluginToolDefinition>> => {
  const tools = new Map<string, PluginToolDefinition>();

  // Load tools from manifest
  if (manifest.tools) {
    for (const toolRef of manifest.tools) {
      const toolPath = join(pluginPath, PLUGIN_SUBDIRS.tools, toolRef.file);
      const toolDef = await loadToolModule(toolPath);

      if (toolDef) {
        toolDef.name = toolRef.name; // Override with manifest name
        tools.set(toolRef.name, toolDef);
      }
    }
  }

  return tools;
};
