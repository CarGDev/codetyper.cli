/**
 * Configuration management for CodeTyper CLI
 */

import fs from "fs/promises";
import path from "path";
import type { Config, Provider } from "@/types/index";
import { DIRS, FILES } from "@constants/paths";

/**
 * Default configuration values
 */
const getDefaults = (): Config => ({
  provider: "copilot",
  model: "auto",
  theme: "default",
  maxIterations: 20,
  timeout: 30000,
  cascadeEnabled: true,
  protectedPaths: [
    ".git",
    "node_modules",
    ".env",
    ".env.local",
    ".env.production",
    "dist",
    "build",
    ".next",
    "__pycache__",
    "venv",
    ".venv",
  ],
});

/**
 * Environment variable mapping for providers
 */
const PROVIDER_ENV_VARS: Record<Provider, string> = {
  copilot: "GITHUB_COPILOT_TOKEN",
  ollama: "OLLAMA_HOST",
};

/**
 * Config state (singleton pattern using closure)
 */
let configState: Config = getDefaults();
let configLoaded = false;
let configLoadPromise: Promise<void> | null = null;

/**
 * Load configuration from file (with caching)
 */
export const loadConfig = async (): Promise<void> => {
  // Return cached config if already loaded
  if (configLoaded) {
    return;
  }

  // If loading is in progress, wait for it
  if (configLoadPromise) {
    return configLoadPromise;
  }

  // Start loading
  configLoadPromise = (async () => {
    try {
      const data = await fs.readFile(FILES.config, "utf-8");
      const loaded = JSON.parse(data);

      // Clean up deprecated keys
      delete loaded.models;

      configState = { ...getDefaults(), ...loaded };
    } catch {
      // Config file doesn't exist or is invalid, use defaults
      configState = getDefaults();
    }
    configLoaded = true;
  })();

  return configLoadPromise;
};

/**
 * Save configuration to file
 */
export const saveConfig = async (): Promise<void> => {
  try {
    await fs.mkdir(DIRS.config, { recursive: true });
    await fs.writeFile(
      FILES.config,
      JSON.stringify(configState, null, 2),
      "utf-8",
    );
  } catch (error) {
    throw new Error(`Failed to save config: ${error}`);
  }
};

/**
 * Get configuration value
 */
export const getConfigValue = <K extends keyof Config>(key: K): Config[K] => {
  return configState[key];
};

/**
 * Set configuration value
 */
export const setConfigValue = <K extends keyof Config>(
  key: K,
  value: Config[K],
): void => {
  configState[key] = value;
};

/**
 * Get full configuration
 */
export const getAllConfig = (): Config => ({ ...configState });

/**
 * Get API key for provider from environment
 */
export const getApiKey = (provider?: Provider): string | undefined => {
  const targetProvider = provider ?? configState.provider;
  const envVar = PROVIDER_ENV_VARS[targetProvider];
  return envVar ? process.env[envVar] : undefined;
};

/**
 * Get configured model
 */
export const getModel = (): string => {
  return configState.model ?? "auto";
};

/**
 * Get config file path
 */
export const getConfigPath = (): string => FILES.config;

/**
 * Check if a path is protected
 */
export const isProtectedPath = (filePath: string): boolean => {
  const normalizedPath = path.normalize(filePath);
  return configState.protectedPaths.some((protectedPath) =>
    normalizedPath.includes(protectedPath),
  );
};

/**
 * Reset configuration to defaults
 */
export const resetConfig = (): void => {
  configState = getDefaults();
};

/**
 * Initialize and get config (convenience function)
 */
export const getConfig = async (): Promise<{
  get: <K extends keyof Config>(key: K) => Config[K];
  set: <K extends keyof Config>(key: K, value: Config[K]) => void;
  getAll: () => Config;
  save: () => Promise<void>;
  getApiKey: (provider?: Provider) => string | undefined;
  getModel: () => string;
  getConfigPath: () => string;
  isProtectedPath: (filePath: string) => boolean;
  reset: () => void;
}> => {
  await loadConfig();
  return {
    get: getConfigValue,
    set: setConfigValue,
    getAll: getAllConfig,
    save: saveConfig,
    getApiKey,
    getModel,
    getConfigPath,
    isProtectedPath,
    reset: resetConfig,
  };
};
