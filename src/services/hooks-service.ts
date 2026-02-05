/**
 * Hooks Service
 *
 * Manages lifecycle hooks for tool execution and session events
 */

import { spawn } from "child_process";
import { readFile, access, constants } from "fs/promises";
import { join, isAbsolute, resolve } from "path";
import type {
  HookDefinition,
  HooksConfig,
  HookEventType,
  HookResult,
  HookInput,
  PreToolUseHookInput,
  PostToolUseHookInput,
  HookExecutionError,
} from "@/types/hooks";
import type { ToolResult } from "@/types/tools";
import {
  HOOKS_CONFIG_FILE,
  DEFAULT_HOOK_TIMEOUT,
  HOOK_EXIT_CODES,
  HOOK_SHELL,
  MAX_HOOK_OUTPUT_SIZE,
  HOOK_ENV_PREFIX,
} from "@constants/hooks";
import { DIRS, LOCAL_CONFIG_DIR } from "@constants/paths";

/**
 * Cached hooks configuration
 */
interface HooksCache {
  global: HookDefinition[];
  local: HookDefinition[];
  loaded: boolean;
}

const hooksCache: HooksCache = {
  global: [],
  local: [],
  loaded: false,
};

/**
 * Load hooks configuration from a file
 */
const loadHooksFromFile = async (
  filePath: string,
): Promise<HookDefinition[]> => {
  try {
    await access(filePath, constants.R_OK);
    const content = await readFile(filePath, "utf-8");
    const config: HooksConfig = JSON.parse(content);

    if (!Array.isArray(config.hooks)) {
      return [];
    }

    return config.hooks.filter(
      (hook) => hook.enabled !== false && hook.event && hook.script,
    );
  } catch {
    return [];
  }
};

/**
 * Load all hooks from global and local configurations
 */
export const loadHooks = async (workingDir: string): Promise<void> => {
  const globalPath = join(DIRS.config, HOOKS_CONFIG_FILE);
  const localPath = join(workingDir, LOCAL_CONFIG_DIR, HOOKS_CONFIG_FILE);

  const [globalHooks, localHooks] = await Promise.all([
    loadHooksFromFile(globalPath),
    loadHooksFromFile(localPath),
  ]);

  hooksCache.global = globalHooks;
  hooksCache.local = localHooks;
  hooksCache.loaded = true;
};

/**
 * Refresh hooks cache
 */
export const refreshHooks = async (workingDir: string): Promise<void> => {
  hooksCache.loaded = false;
  await loadHooks(workingDir);
};

/**
 * Get hooks for a specific event type
 */
export const getHooksForEvent = (event: HookEventType): HookDefinition[] => {
  if (!hooksCache.loaded) {
    return [];
  }

  const allHooks = [...hooksCache.global, ...hooksCache.local];
  return allHooks.filter((hook) => hook.event === event);
};

/**
 * Resolve script path to absolute path
 */
const resolveScriptPath = (script: string, workingDir: string): string => {
  if (isAbsolute(script)) {
    return script;
  }
  return resolve(workingDir, script);
};

/**
 * Execute a single hook script
 */
const executeHookScript = async (
  hook: HookDefinition,
  input: HookInput,
  workingDir: string,
): Promise<HookResult> => {
  const scriptPath = resolveScriptPath(hook.script, workingDir);
  const timeout = hook.timeout ?? DEFAULT_HOOK_TIMEOUT;

  // Verify script exists
  try {
    await access(scriptPath, constants.X_OK);
  } catch {
    return {
      action: "warn",
      message: `Hook script not found or not executable: ${scriptPath}`,
    };
  }

  return new Promise((resolvePromise) => {
    const env = {
      ...process.env,
      [`${HOOK_ENV_PREFIX}EVENT`]: hook.event,
      [`${HOOK_ENV_PREFIX}WORKING_DIR`]: workingDir,
    };

    const child = spawn(HOOK_SHELL, [scriptPath], {
      cwd: workingDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let outputSize = 0;

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      resolvePromise({
        action: "warn",
        message: `Hook timed out after ${timeout}ms: ${hook.name || hook.script}`,
      });
    }, timeout);

    child.stdout.on("data", (data: Buffer) => {
      outputSize += data.length;
      if (outputSize <= MAX_HOOK_OUTPUT_SIZE) {
        stdout += data.toString();
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      outputSize += data.length;
      if (outputSize <= MAX_HOOK_OUTPUT_SIZE) {
        stderr += data.toString();
      }
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);

      const exitCode = code ?? HOOK_EXIT_CODES.ALLOW;

      if (exitCode === HOOK_EXIT_CODES.ALLOW) {
        // Check if stdout contains modified input
        if (stdout.trim()) {
          try {
            const parsed = JSON.parse(stdout.trim());
            if (parsed.updatedInput) {
              resolvePromise({
                action: "modify",
                updatedInput: parsed.updatedInput,
              });
              return;
            }
          } catch {
            // Not JSON or no updatedInput, just allow
          }
        }
        resolvePromise({ action: "allow" });
      } else if (exitCode === HOOK_EXIT_CODES.WARN) {
        resolvePromise({
          action: "warn",
          message: stderr.trim() || `Hook warning: ${hook.name || hook.script}`,
        });
      } else if (exitCode === HOOK_EXIT_CODES.BLOCK) {
        resolvePromise({
          action: "block",
          message:
            stderr.trim() || `Blocked by hook: ${hook.name || hook.script}`,
        });
      } else {
        resolvePromise({
          action: "warn",
          message: `Hook exited with unexpected code ${exitCode}: ${hook.name || hook.script}`,
        });
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      resolvePromise({
        action: "warn",
        message: `Hook execution error: ${error.message}`,
      });
    });

    // Send input to stdin
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
};

/**
 * Execute all hooks for a specific event
 */
const executeHooks = async (
  event: HookEventType,
  input: HookInput,
  workingDir: string,
): Promise<HookResult> => {
  const hooks = getHooksForEvent(event);

  if (hooks.length === 0) {
    return { action: "allow" };
  }

  const errors: HookExecutionError[] = [];
  let modifiedInput: Record<string, unknown> | null = null;

  for (const hook of hooks) {
    const result = await executeHookScript(hook, input, workingDir);

    if (result.action === "block") {
      return result;
    }

    if (result.action === "warn") {
      errors.push({
        hook,
        error: result.message,
      });
    }

    if (result.action === "modify") {
      modifiedInput = {
        ...(modifiedInput ?? {}),
        ...result.updatedInput,
      };
    }
  }

  if (modifiedInput) {
    return {
      action: "modify",
      updatedInput: modifiedInput,
    };
  }

  if (errors.length > 0) {
    return {
      action: "warn",
      message: errors.map((e) => e.error).join("\n"),
    };
  }

  return { action: "allow" };
};

/**
 * Execute PreToolUse hooks
 */
export const executePreToolUseHooks = async (
  sessionId: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
  workingDir: string,
): Promise<HookResult> => {
  if (!hooksCache.loaded) {
    await loadHooks(workingDir);
  }

  const input: PreToolUseHookInput = {
    sessionId,
    toolName,
    toolArgs,
    workingDir,
  };

  return executeHooks("PreToolUse", input, workingDir);
};

/**
 * Execute PostToolUse hooks
 */
export const executePostToolUseHooks = async (
  sessionId: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
  result: ToolResult,
  workingDir: string,
): Promise<void> => {
  if (!hooksCache.loaded) {
    await loadHooks(workingDir);
  }

  const input: PostToolUseHookInput = {
    sessionId,
    toolName,
    toolArgs,
    result: {
      success: result.success,
      output: result.output,
      error: result.error,
    },
    workingDir,
  };

  // PostToolUse hooks don't block, just execute them
  await executeHooks("PostToolUse", input, workingDir);
};

/**
 * Execute SessionStart hooks
 */
export const executeSessionStartHooks = async (
  sessionId: string,
  workingDir: string,
  provider: string,
  model: string,
): Promise<void> => {
  if (!hooksCache.loaded) {
    await loadHooks(workingDir);
  }

  const input = {
    sessionId,
    workingDir,
    provider,
    model,
  };

  await executeHooks("SessionStart", input, workingDir);
};

/**
 * Execute SessionEnd hooks
 */
export const executeSessionEndHooks = async (
  sessionId: string,
  workingDir: string,
  duration: number,
  messageCount: number,
): Promise<void> => {
  if (!hooksCache.loaded) {
    await loadHooks(workingDir);
  }

  const input = {
    sessionId,
    workingDir,
    duration,
    messageCount,
  };

  await executeHooks("SessionEnd", input, workingDir);
};

/**
 * Execute UserPromptSubmit hooks
 */
export const executeUserPromptSubmitHooks = async (
  sessionId: string,
  prompt: string,
  workingDir: string,
): Promise<HookResult> => {
  if (!hooksCache.loaded) {
    await loadHooks(workingDir);
  }

  const input = {
    sessionId,
    prompt,
    workingDir,
  };

  return executeHooks("UserPromptSubmit", input, workingDir);
};

/**
 * Execute Stop hooks
 */
export const executeStopHooks = async (
  sessionId: string,
  workingDir: string,
  reason: "interrupt" | "complete" | "error",
): Promise<void> => {
  if (!hooksCache.loaded) {
    await loadHooks(workingDir);
  }

  const input = {
    sessionId,
    workingDir,
    reason,
  };

  await executeHooks("Stop", input, workingDir);
};

/**
 * Check if hooks are loaded
 */
export const isHooksLoaded = (): boolean => {
  return hooksCache.loaded;
};

/**
 * Get all loaded hooks
 */
export const getAllHooks = (): HookDefinition[] => {
  return [...hooksCache.global, ...hooksCache.local];
};

/**
 * Clear hooks cache
 */
export const clearHooksCache = (): void => {
  hooksCache.global = [];
  hooksCache.local = [];
  hooksCache.loaded = false;
};
