/**
 * Prompt Builder Service
 *
 * Builds and manages system prompts based on interaction mode.
 * Handles mode switching and context injection.
 * Uses tier-aware mode composer for model-specific prompts.
 */

import {
  composePrompt,
  type ModePromptContext,
  type ComposedPrompt,
} from "@prompts/system/modes/composer";
import type { PromptMode } from "@prompts/system/modes/mode-types";
import type { ModelTier, ModelProvider, ModelParams } from "@prompts/system/builder";
import { buildSystemPromptWithRules } from "@services/rules-service";
import { projectConfig } from "@services/project-config";
import { getProjectContextForAskMode } from "@services/context-gathering";
import type { InteractionMode } from "@/types/tui";

/**
 * Map interaction mode to prompt mode
 */
const INTERACTION_TO_PROMPT_MODE: Record<InteractionMode, PromptMode> = {
  agent: "agent",
  ask: "ask",
  "code-review": "code-review",
};

export interface PromptContext {
  workingDir: string;
  isGitRepo: boolean;
  platform: string;
  today: string;
  model?: string;
  gitBranch?: string;
  gitStatus?: string;
  recentCommits?: string[];
  projectContext?: string;
  prContext?: string;
  debugContext?: string;
  planContext?: string;
}

export interface PromptBuilderState {
  currentMode: InteractionMode;
  basePrompt: string;
  fullPrompt: string;
  context: PromptContext;
  tier: ModelTier;
  provider: ModelProvider;
  params: ModelParams;
}

/**
 * Build mode prompt using tier-aware composer
 */
const buildModePromptWithTier = (
  mode: InteractionMode,
  context: PromptContext,
): ComposedPrompt => {
  const promptMode = INTERACTION_TO_PROMPT_MODE[mode];

  // Build context for ask mode
  const projectContext =
    mode === "ask"
      ? context.projectContext ?? getProjectContextForAskMode(context.workingDir)
      : undefined;

  // Create mode-aware prompt context
  const modeContext: ModePromptContext = {
    workingDir: context.workingDir,
    isGitRepo: context.isGitRepo,
    platform: context.platform,
    today: context.today,
    modelId: context.model || "gpt-4o", // Default to balanced model
    gitBranch: context.gitBranch,
    gitStatus: context.gitStatus,
    recentCommits: context.recentCommits,
    projectRules: undefined, // Will be added by rules-service
    customInstructions: projectContext,
    mode: promptMode,
    prContext: context.prContext,
    debugContext: context.debugContext,
    planContext: context.planContext,
  };

  return composePrompt(modeContext);
};

/**
 * Execute git command asynchronously
 */
const execGitCommand = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const proc = spawn("git", args, { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code: number) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `git exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
};

/**
 * Get git context for prompt building (async, non-blocking)
 */
export const getGitContext = async (): Promise<{
  isGitRepo: boolean;
  branch?: string;
  status?: string;
  recentCommits?: string[];
}> => {
  try {
    // Run all git commands in parallel for faster execution
    const [branch, status, commits] = await Promise.all([
      execGitCommand(["branch", "--show-current"]),
      execGitCommand(["status", "--short"]).then((s) => s || "(clean)"),
      execGitCommand(["log", "--oneline", "-5"]).then((s) =>
        s.split("\n").filter(Boolean),
      ),
    ]);

    return { isGitRepo: true, branch, status, recentCommits: commits };
  } catch {
    return { isGitRepo: false };
  }
};

/**
 * Build base context for all modes
 */
export const buildBaseContext = async (
  model?: string,
): Promise<PromptContext> => {
  const gitContext = await getGitContext();

  return {
    workingDir: process.cwd(),
    isGitRepo: gitContext.isGitRepo,
    platform: process.platform,
    today: new Date().toISOString().split("T")[0],
    model,
    gitBranch: gitContext.branch,
    gitStatus: gitContext.status,
    recentCommits: gitContext.recentCommits,
  };
};

/**
 * Build the base prompt for a specific mode
 */
export const buildModePrompt = (
  mode: InteractionMode,
  context: PromptContext,
): string => {
  const composed = buildModePromptWithTier(mode, context);
  return composed.prompt;
};

/**
 * Build the base prompt with full tier/provider info
 */
export const buildModePromptWithInfo = (
  mode: InteractionMode,
  context: PromptContext,
): ComposedPrompt => {
  return buildModePromptWithTier(mode, context);
};

/**
 * Build complete system prompt with rules and learnings
 */
export const buildCompletePrompt = async (
  mode: InteractionMode,
  context: PromptContext,
  appendPrompt?: string,
): Promise<{ prompt: string; rulesPaths: string[] }> => {
  const basePrompt = buildModePrompt(mode, context);

  const { prompt: promptWithRules, rulesPaths } =
    await buildSystemPromptWithRules(basePrompt, context.workingDir);

  let finalPrompt = promptWithRules;

  const learningsContext = await projectConfig.buildLearningsContext();
  if (learningsContext) {
    finalPrompt = finalPrompt + "\n\n" + learningsContext;
  }

  if (appendPrompt) {
    finalPrompt = finalPrompt + "\n\n" + appendPrompt;
  }

  return { prompt: finalPrompt, rulesPaths };
};

/**
 * Create a prompt builder instance for managing prompts across mode changes
 */
export const createPromptBuilder = (initialModel?: string) => {
  let state: PromptBuilderState | null = null;

  const initialize = async (
    mode: InteractionMode,
    appendPrompt?: string,
  ): Promise<string> => {
    const context = await buildBaseContext(initialModel);
    const { prompt } = await buildCompletePrompt(mode, context, appendPrompt);
    const composed = buildModePromptWithTier(mode, context);

    state = {
      currentMode: mode,
      basePrompt: composed.prompt,
      fullPrompt: prompt,
      context,
      tier: composed.tier,
      provider: composed.provider,
      params: composed.params,
    };

    return prompt;
  };

  const switchMode = async (
    newMode: InteractionMode,
    appendPrompt?: string,
  ): Promise<string> => {
    if (!state) {
      return initialize(newMode, appendPrompt);
    }

    if (state.currentMode === newMode) {
      return state.fullPrompt;
    }

    const { prompt } = await buildCompletePrompt(
      newMode,
      state.context,
      appendPrompt,
    );
    const composed = buildModePromptWithTier(newMode, state.context);

    state = {
      currentMode: newMode,
      basePrompt: composed.prompt,
      fullPrompt: prompt,
      context: state.context,
      tier: composed.tier,
      provider: composed.provider,
      params: composed.params,
    };

    return prompt;
  };

  const getCurrentPrompt = (): string | null => state?.fullPrompt ?? null;

  const getCurrentMode = (): InteractionMode | null =>
    state?.currentMode ?? null;

  const getModelInfo = (): { tier: ModelTier; provider: ModelProvider; params: ModelParams } | null => {
    if (!state) return null;
    return {
      tier: state.tier,
      provider: state.provider,
      params: state.params,
    };
  };

  const updateContext = async (
    updates: Partial<PromptContext>,
    appendPrompt?: string,
  ): Promise<string> => {
    if (!state) {
      throw new Error("Prompt builder not initialized");
    }

    const newContext = { ...state.context, ...updates };
    const { prompt } = await buildCompletePrompt(
      state.currentMode,
      newContext,
      appendPrompt,
    );
    const composed = buildModePromptWithTier(state.currentMode, newContext);

    state = {
      ...state,
      context: newContext,
      fullPrompt: prompt,
      tier: composed.tier,
      provider: composed.provider,
      params: composed.params,
    };

    return prompt;
  };

  return {
    initialize,
    switchMode,
    getCurrentPrompt,
    getCurrentMode,
    getModelInfo,
    updateContext,
  };
};

export type PromptBuilder = ReturnType<typeof createPromptBuilder>;
