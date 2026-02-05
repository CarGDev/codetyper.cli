/**
 * Mode Composer
 *
 * Composes tier-aware system prompts with mode-specific overlays.
 * This is the main entry point for generating complete system prompts.
 */

import type { ModelTier, ModelProvider, PromptContext, ModelParams } from "@prompts/system/builder";
import { buildSystemPrompt, detectModelTier, detectModelProvider, getModelParams } from "@prompts/system/builder";
import type { PromptMode } from "@prompts/system/modes/mode-types";
import { MODE_REGISTRY, isReadOnlyMode } from "@prompts/system/modes/mode-types";
import { getAskModePrompt } from "@prompts/system/modes/ask-mode";
import { getPlanModePrompt } from "@prompts/system/modes/plan-mode";
import { getCodeReviewModePrompt } from "@prompts/system/modes/code-review-mode";
import { getDebugModePrompt } from "@prompts/system/modes/debug-mode";
import { getRefactorModePrompt } from "@prompts/system/modes/refactor-mode";
import { getImplementModePrompt } from "@prompts/system/modes/implement-mode";

/**
 * Extended prompt context with mode
 */
export interface ModePromptContext extends PromptContext {
  mode?: PromptMode;
  planContext?: string;
  prContext?: string;
  debugContext?: string;
}

/**
 * Result of prompt composition
 */
export interface ComposedPrompt {
  prompt: string;
  tier: ModelTier;
  provider: ModelProvider;
  mode: PromptMode;
  params: ModelParams;
  readOnly: boolean;
}

/**
 * Get the mode-specific prompt overlay for a tier
 */
const getModeOverlay = (mode: PromptMode, tier: ModelTier): string => {
  const modeOverlays: Record<PromptMode, (tier: ModelTier) => string> = {
    agent: () => "",  // Agent mode uses tier prompt directly
    ask: getAskModePrompt,
    plan: getPlanModePrompt,
    "code-review": getCodeReviewModePrompt,
    debug: getDebugModePrompt,
    refactor: getRefactorModePrompt,
    implement: getImplementModePrompt,
  };

  return modeOverlays[mode](tier);
};

/**
 * Build context section for specific modes
 */
const buildModeContext = (context: ModePromptContext): string => {
  const sections: string[] = [];

  if (context.mode === "plan" && context.planContext) {
    sections.push(`
# Plan Context

${context.planContext}`);
  }

  if (context.mode === "code-review" && context.prContext) {
    sections.push(`
# PR Context

${context.prContext}`);
  }

  if (context.mode === "debug" && context.debugContext) {
    sections.push(`
# Debug Context

${context.debugContext}`);
  }

  return sections.join("\n\n");
};

/**
 * Compose a complete system prompt with tier and mode
 */
export const composePrompt = (context: ModePromptContext): ComposedPrompt => {
  const mode = context.mode || "agent";
  const tier = detectModelTier(context.modelId);
  const provider = detectModelProvider(context.modelId);
  const params = getModelParams(context.modelId);

  // Build base tier prompt
  const basePrompt = buildSystemPrompt(context);

  // Add mode overlay
  const modeOverlay = getModeOverlay(mode, tier);

  // Add mode-specific context
  const modeContext = buildModeContext(context);

  // Compose final prompt
  const sections = [basePrompt];

  if (modeOverlay) {
    sections.push(modeOverlay);
  }

  if (modeContext) {
    sections.push(modeContext);
  }

  // Add mode indicator
  const modeIndicator = `
# Current Mode

Mode: ${mode}
Read-only: ${isReadOnlyMode(mode) ? "Yes" : "No"}`;

  sections.push(modeIndicator);

  return {
    prompt: sections.filter(Boolean).join("\n\n"),
    tier,
    provider,
    mode,
    params,
    readOnly: isReadOnlyMode(mode),
  };
};

/**
 * Quick compose for common use cases
 */
export const composeAgentPrompt = (context: PromptContext): ComposedPrompt => {
  return composePrompt({ ...context, mode: "agent" });
};

export const composeAskPrompt = (context: PromptContext): ComposedPrompt => {
  return composePrompt({ ...context, mode: "ask" });
};

export const composePlanPrompt = (context: PromptContext, planContext?: string): ComposedPrompt => {
  return composePrompt({ ...context, mode: "plan", planContext });
};

export const composeCodeReviewPrompt = (context: PromptContext, prContext?: string): ComposedPrompt => {
  return composePrompt({ ...context, mode: "code-review", prContext });
};

export const composeDebugPrompt = (context: PromptContext, debugContext?: string): ComposedPrompt => {
  return composePrompt({ ...context, mode: "debug", debugContext });
};

export const composeRefactorPrompt = (context: PromptContext): ComposedPrompt => {
  return composePrompt({ ...context, mode: "refactor" });
};

export const composeImplementPrompt = (context: PromptContext, planContext?: string): ComposedPrompt => {
  return composePrompt({ ...context, mode: "implement", planContext });
};

/**
 * Get mode metadata for UI/logging
 */
export const getModeInfo = (mode: PromptMode) => {
  return MODE_REGISTRY[mode];
};

/**
 * Recommend a model tier for a mode
 */
export const recommendTierForMode = (mode: PromptMode): "fast" | "balanced" | "thorough" => {
  const preferred = MODE_REGISTRY[mode].preferredTier;

  if (preferred === "any") {
    return "balanced";
  }

  return preferred;
};
