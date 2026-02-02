/**
 * Prompt Builder Service
 *
 * Builds and manages system prompts based on interaction mode.
 * Handles mode switching and context injection.
 */

import { buildAgenticPrompt } from "@prompts/system/agent";
import { buildAskPrompt } from "@prompts/system/ask";
import { buildCodeReviewPrompt } from "@prompts/system/code-review";
import { buildSystemPromptWithRules } from "@services/rules-service";
import { projectConfig } from "@services/project-config";
import { getProjectContextForAskMode } from "@services/context-gathering";
import type { InteractionMode } from "@/types/tui";

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
}

export interface PromptBuilderState {
  currentMode: InteractionMode;
  basePrompt: string;
  fullPrompt: string;
  context: PromptContext;
}

const MODE_PROMPT_BUILDERS: Record<
  InteractionMode,
  (context: PromptContext) => string
> = {
  agent: (ctx) =>
    buildAgenticPrompt({
      workingDir: ctx.workingDir,
      isGitRepo: ctx.isGitRepo,
      platform: ctx.platform,
      today: ctx.today,
      model: ctx.model,
      gitBranch: ctx.gitBranch,
      gitStatus: ctx.gitStatus,
      recentCommits: ctx.recentCommits,
    }),

  ask: (ctx) => {
    const projectContext =
      ctx.projectContext ?? getProjectContextForAskMode(ctx.workingDir);
    return buildAskPrompt({
      workingDir: ctx.workingDir,
      isGitRepo: ctx.isGitRepo,
      platform: ctx.platform,
      today: ctx.today,
      model: ctx.model,
      projectContext,
    });
  },

  "code-review": (ctx) =>
    buildCodeReviewPrompt({
      workingDir: ctx.workingDir,
      isGitRepo: ctx.isGitRepo,
      platform: ctx.platform,
      today: ctx.today,
      model: ctx.model,
      prContext: ctx.prContext,
    }),
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
  const builder = MODE_PROMPT_BUILDERS[mode];
  return builder(context);
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

    state = {
      currentMode: mode,
      basePrompt: buildModePrompt(mode, context),
      fullPrompt: prompt,
      context,
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

    state = {
      currentMode: newMode,
      basePrompt: buildModePrompt(newMode, state.context),
      fullPrompt: prompt,
      context: state.context,
    };

    return prompt;
  };

  const getCurrentPrompt = (): string | null => state?.fullPrompt ?? null;

  const getCurrentMode = (): InteractionMode | null =>
    state?.currentMode ?? null;

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

    state = {
      ...state,
      context: newContext,
      fullPrompt: prompt,
    };

    return prompt;
  };

  return {
    initialize,
    switchMode,
    getCurrentPrompt,
    getCurrentMode,
    updateContext,
  };
};

export type PromptBuilder = ReturnType<typeof createPromptBuilder>;
