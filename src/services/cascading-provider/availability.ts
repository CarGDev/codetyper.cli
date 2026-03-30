/**
 * Provider Availability Service
 *
 * Monitors and checks provider availability
 */

import { spawn } from "child_process";

export interface ProviderStatus {
  available: boolean;
  error?: string;
  lastChecked: number;
}

const providerCache: Record<string, ProviderStatus> = {};
const CACHE_TTL_MS = 30000; // 30 seconds

const isCacheValid = (providerId: string): boolean => {
  const cached = providerCache[providerId];
  if (!cached) {
    return false;
  }
  return Date.now() - cached.lastChecked < CACHE_TTL_MS;
};

export const checkOllamaAvailability = async (): Promise<ProviderStatus> => {
  if (isCacheValid("ollama")) {
    return providerCache["ollama"];
  }

  return new Promise((resolve) => {
    const proc = spawn("ollama", ["list"], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });

    let resolved = false;

    proc.on("close", (code) => {
      if (resolved) return;
      resolved = true;

      const status: ProviderStatus = {
        available: code === 0,
        lastChecked: Date.now(),
        error: code !== 0 ? "Ollama not running or not installed" : undefined,
      };

      providerCache["ollama"] = status;
      resolve(status);
    });

    proc.on("error", (err) => {
      if (resolved) return;
      resolved = true;

      const status: ProviderStatus = {
        available: false,
        lastChecked: Date.now(),
        error: err.message,
      };

      providerCache["ollama"] = status;
      resolve(status);
    });

    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      proc.kill();

      const status: ProviderStatus = {
        available: false,
        lastChecked: Date.now(),
        error: "Ollama check timed out",
      };

      providerCache["ollama"] = status;
      resolve(status);
    }, 5000);
  });
};

export const checkCopilotAvailability = async (): Promise<ProviderStatus> => {
  if (isCacheValid("copilot")) {
    return providerCache["copilot"];
  }

  try {
    const { getProvider } = await import("@providers/core/registry");
    const copilot = getProvider("copilot");
    const isConfigured = await copilot.isConfigured();

    const status: ProviderStatus = {
      available: isConfigured,
      lastChecked: Date.now(),
      error: isConfigured ? undefined : "Copilot not configured",
    };

    providerCache["copilot"] = status;
    return status;
  } catch (err) {
    const status: ProviderStatus = {
      available: false,
      lastChecked: Date.now(),
      error: err instanceof Error ? err.message : String(err),
    };
    providerCache["copilot"] = status;
    return status;
  }
};

export const getProviderStatuses = async (): Promise<
  Record<string, ProviderStatus>
> => {
  const [ollama, copilot] = await Promise.all([
    checkOllamaAvailability(),
    checkCopilotAvailability(),
  ]);

  return {
    ollama,
    copilot,
  };
};

export const clearProviderCache = (): void => {
  Object.keys(providerCache).forEach((key) => {
    delete providerCache[key];
  });
};

export const invalidateProvider = (providerId: string): void => {
  delete providerCache[providerId];
};
