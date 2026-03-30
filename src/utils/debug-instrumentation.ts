/**
 * Debug Instrumentation
 *
 * Adds comprehensive logging to all critical code paths.
 * Call `instrumentAll()` once at startup when ENV=DEV.
 * Logs to /tmp/codetyper.cli.log via debugLog.
 *
 * This module instruments by importing key modules and wrapping their
 * exports with logging, avoiding the need to edit 20+ source files.
 */

import { debugLog, logSession, logProvider, logMcp } from "@utils/debug-logger";

const isDevMode = (): boolean =>
  process.env.ENV === "DEV" || process.env.CODETYPER_DEBUG === "true";

/**
 * Instrument token refresh to log cache hits/misses
 */
const instrumentTokenRefresh = async (): Promise<void> => {
  try {
    const tokenModule = await import("@providers/copilot/auth/token");
    const originalRefresh = tokenModule.refreshToken;
    const wrapped = async (...args: Parameters<typeof originalRefresh>) => {
      logSession("token refresh: starting");
      const start = Date.now();
      const result = await originalRefresh(...args);
      logSession("token refresh: complete", { duration: Date.now() - start, hasToken: !!result.token });
      return result;
    };
    // @ts-expect-error — wrapping module export
    tokenModule.refreshToken = wrapped;
  } catch {
    // Module may not be loaded yet — that's fine
  }
};

/**
 * Instrument session operations
 */
const instrumentSession = async (): Promise<void> => {
  try {
    const sessionModule = await import("@services/core/session");
    const originalCreate = sessionModule.createSession;
    // @ts-expect-error — wrapping
    sessionModule.createSession = async (...args: Parameters<typeof originalCreate>) => {
      logSession("creating session", { agent: args[0] });
      const result = await originalCreate(...args);
      logSession("session created", { id: result.id });
      return result;
    };

    const originalLoad = sessionModule.loadSession;
    // @ts-expect-error — wrapping
    sessionModule.loadSession = async (...args: Parameters<typeof originalLoad>) => {
      logSession("loading session", { id: args[0] });
      const result = await originalLoad(...args);
      logSession("session loaded", { id: args[0], found: !!result, messageCount: result?.messages?.length });
      return result;
    };
  } catch {
    // Module may not be loaded yet
  }
};

/**
 * Instrument MCP operations
 */
const instrumentMCP = async (): Promise<void> => {
  try {
    const managerModule = await import("@services/mcp/manager");
    if (managerModule.connectAllServers) {
      const original = managerModule.connectAllServers;
      // @ts-expect-error — wrapping
      managerModule.connectAllServers = async () => {
        logMcp("connecting all MCP servers");
        const result = await original();
        logMcp("MCP servers connected", result);
        return result;
      };
    }
  } catch {
    // MCP module may not exist or not be used
  }
};

/**
 * Instrument provider availability checks
 */
const instrumentAvailability = async (): Promise<void> => {
  try {
    const availModule = await import("@services/cascading-provider/availability");

    const originalOllama = availModule.checkOllamaAvailability;
    // @ts-expect-error — wrapping
    availModule.checkOllamaAvailability = async () => {
      logProvider("checking Ollama availability");
      const result = await originalOllama();
      logProvider("Ollama availability", { available: result.available, error: result.error });
      return result;
    };

    const originalCopilot = availModule.checkCopilotAvailability;
    // @ts-expect-error — wrapping
    availModule.checkCopilotAvailability = async () => {
      logProvider("checking Copilot availability");
      const result = await originalCopilot();
      logProvider("Copilot availability", { available: result.available, error: result.error });
      return result;
    };
  } catch {
    // Module may not be loaded
  }
};

/**
 * Instrument hooks service
 */
const instrumentHooks = async (): Promise<void> => {
  try {
    const hooksModule = await import("@services/hooks-service");
    if (hooksModule.loadHooks) {
      const original = hooksModule.loadHooks;
      // @ts-expect-error — wrapping
      hooksModule.loadHooks = async (...args: Parameters<typeof original>) => {
        debugLog("hooks", "loading hooks");
        const result = await original(...args);
        debugLog("hooks", "hooks loaded", { count: Array.isArray(result) ? result.length : "unknown" });
        return result;
      };
    }
    if (hooksModule.executePreToolUseHooks) {
      const original = hooksModule.executePreToolUseHooks;
      // @ts-expect-error — wrapping
      hooksModule.executePreToolUseHooks = async (...args: Parameters<typeof original>) => {
        debugLog("hooks", "executing pre-tool hooks", { tool: args[0] });
        const result = await original(...args);
        debugLog("hooks", "pre-tool hooks complete", { result });
        return result;
      };
    }
  } catch {
    // Module may not exist
  }
};

/**
 * Instrument auto-compaction
 */
const instrumentCompaction = async (): Promise<void> => {
  try {
    const compactModule = await import("@services/auto-compaction");
    if (compactModule.checkCompactionNeeded) {
      const original = compactModule.checkCompactionNeeded;
      // @ts-expect-error — wrapping
      compactModule.checkCompactionNeeded = (...args: Parameters<typeof original>) => {
        const result = original(...args);
        debugLog("compaction", "compaction check", { needsCompaction: result.needsCompaction });
        return result;
      };
    }
  } catch {
    // Module may not exist
  }
};

/**
 * Call this once at startup to instrument all critical paths.
 * Only activates when ENV=DEV or CODETYPER_DEBUG=true.
 */
export const instrumentAll = async (): Promise<void> => {
  if (!isDevMode()) return;

  debugLog("init", "=== DEBUG INSTRUMENTATION ENABLED ===");
  debugLog("init", "Logging to /tmp/codetyper.cli.log");
  debugLog("init", `ENV=${process.env.ENV}, CODETYPER_DEBUG=${process.env.CODETYPER_DEBUG}`);
  debugLog("init", `CWD=${process.cwd()}`);
  debugLog("init", `Node=${process.version}, Platform=${process.platform}`);

  await Promise.allSettled([
    instrumentTokenRefresh(),
    instrumentSession(),
    instrumentMCP(),
    instrumentAvailability(),
    instrumentHooks(),
    instrumentCompaction(),
  ]);

  debugLog("init", "instrumentation complete");
};
