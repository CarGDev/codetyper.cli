/**
 * System Prompt Builder
 *
 * Routes to the correct tier and provider based on model ID.
 * Combines base + tier + provider prompts into a complete system prompt.
 */

import { buildFastTierPrompt, isFastTierModel } from "@prompts/system/tiers/fast";
import { buildBalancedTierPrompt, isBalancedTierModel } from "@prompts/system/tiers/balanced";
import { buildThoroughTierPrompt, isThoroughTierModel } from "@prompts/system/tiers/thorough";
import { buildOpenAIEnhancements, isOpenAIModel, getOpenAIParams } from "@prompts/system/providers/openai";
import { buildAnthropicEnhancements, isAnthropicModel, getAnthropicParams } from "@prompts/system/providers/anthropic";
import { buildGoogleEnhancements, isGoogleModel, getGoogleParams } from "@prompts/system/providers/google";
import { buildOllamaEnhancements, isOllamaModel, getOllamaParams } from "@prompts/system/providers/ollama";
import { buildCopilotEnhancements, isCopilotModel, getCopilotParams } from "@prompts/system/providers/copilot";

/**
 * Model tier classification
 */
export type ModelTier = "fast" | "balanced" | "thorough";

/**
 * Provider classification
 */
export type ModelProvider = "copilot" | "openai" | "anthropic" | "google" | "ollama" | "unknown";

/**
 * Environment context for prompt building
 */
export interface PromptContext {
  workingDir: string;
  isGitRepo: boolean;
  platform: string;
  today: string;
  modelId: string;
  gitStatus?: string;
  gitBranch?: string;
  recentCommits?: string[];
  projectRules?: string;
  customInstructions?: string;
}

/**
 * Model parameters returned by the builder
 */
export interface ModelParams {
  temperature: number;
  topP: number;
  topK?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repeatPenalty?: number;
}

/**
 * Detect the tier for a given model
 */
export const detectModelTier = (modelId: string): ModelTier => {
  if (isThoroughTierModel(modelId)) {
    return "thorough";
  }
  if (isFastTierModel(modelId)) {
    return "fast";
  }
  if (isBalancedTierModel(modelId)) {
    return "balanced";
  }
  // Default to balanced for unknown models
  return "balanced";
};

/**
 * Detect the provider for a given model
 */
export const detectModelProvider = (modelId: string): ModelProvider => {
  // Check Copilot first since it provides access to multiple model families
  if (isCopilotModel(modelId)) {
    return "copilot";
  }
  if (isOpenAIModel(modelId)) {
    return "openai";
  }
  if (isAnthropicModel(modelId)) {
    return "anthropic";
  }
  if (isGoogleModel(modelId)) {
    return "google";
  }
  if (isOllamaModel(modelId)) {
    return "ollama";
  }
  return "unknown";
};

/**
 * Build the tier-specific prompt
 */
const buildTierPrompt = (tier: ModelTier): string => {
  const tierBuilders: Record<ModelTier, () => string> = {
    fast: buildFastTierPrompt,
    balanced: buildBalancedTierPrompt,
    thorough: buildThoroughTierPrompt,
  };
  return tierBuilders[tier]();
};

/**
 * Build provider-specific enhancements
 */
const buildProviderEnhancements = (provider: ModelProvider): string => {
  const providerBuilders: Record<ModelProvider, () => string> = {
    copilot: buildCopilotEnhancements,
    openai: buildOpenAIEnhancements,
    anthropic: buildAnthropicEnhancements,
    google: buildGoogleEnhancements,
    ollama: buildOllamaEnhancements,
    unknown: () => "",
  };
  return providerBuilders[provider]();
};

/**
 * Get model-specific parameters
 */
export const getModelParams = (modelId: string): ModelParams => {
  const provider = detectModelProvider(modelId);

  const paramGetters: Record<ModelProvider, (id: string) => ModelParams> = {
    copilot: (id) => {
      const p = getCopilotParams(id);
      return {
        temperature: p.temperature,
        topP: p.topP,
        maxTokens: p.maxTokens,
      };
    },
    openai: (id) => {
      const p = getOpenAIParams(id);
      return {
        temperature: p.temperature,
        topP: p.topP,
        frequencyPenalty: p.frequencyPenalty,
        presencePenalty: p.presencePenalty,
      };
    },
    anthropic: (id) => {
      const p = getAnthropicParams(id);
      return {
        temperature: p.temperature,
        topP: p.topP,
        topK: p.topK,
        maxTokens: p.maxTokens,
      };
    },
    google: (id) => {
      const p = getGoogleParams(id);
      return {
        temperature: p.temperature,
        topP: p.topP,
        topK: p.topK,
        maxTokens: p.maxOutputTokens,
      };
    },
    ollama: (id) => {
      const p = getOllamaParams(id);
      return {
        temperature: p.temperature,
        topP: p.topP,
        topK: p.topK,
        repeatPenalty: p.repeatPenalty,
        maxTokens: p.numPredict,
      };
    },
    unknown: () => ({
      temperature: 0.2,
      topP: 0.95,
    }),
  };

  return paramGetters[provider](modelId);
};

/**
 * Build the environment section
 */
const buildEnvironmentSection = (context: PromptContext, tier: ModelTier, provider: ModelProvider): string => {
  const envLines = [
    `Working directory: ${context.workingDir}`,
    `Is directory a git repo: ${context.isGitRepo ? "Yes" : "No"}`,
    `Platform: ${context.platform}`,
    `Today's date: ${context.today}`,
    `Model: ${context.modelId}`,
    `Model tier: ${tier}`,
    `Provider: ${provider}`,
  ];

  return `
# Environment

<env>
${envLines.join("\n")}
</env>`;
};

/**
 * Build the git status section
 */
const buildGitSection = (context: PromptContext): string => {
  if (!context.isGitRepo) {
    return "";
  }

  const parts = [`Current branch: ${context.gitBranch || "unknown"}`];

  if (context.gitStatus) {
    parts.push(`Status: ${context.gitStatus}`);
  }

  if (context.recentCommits?.length) {
    parts.push(`Recent commits:\n${context.recentCommits.join("\n")}`);
  }

  return `
# Git Status

${parts.join("\n")}`;
};

/**
 * Build the complete system prompt
 */
export const buildSystemPrompt = (context: PromptContext): string => {
  const tier = detectModelTier(context.modelId);
  const provider = detectModelProvider(context.modelId);

  const sections = [
    // Core tier-specific prompt (includes base)
    buildTierPrompt(tier),

    // Provider-specific enhancements
    buildProviderEnhancements(provider),

    // Environment context
    buildEnvironmentSection(context, tier, provider),

    // Git status
    buildGitSection(context),
  ];

  // Add project rules if provided
  if (context.projectRules) {
    sections.push(`
# Project Rules

${context.projectRules}`);
  }

  // Add custom instructions if provided
  if (context.customInstructions) {
    sections.push(`
# Custom Instructions

${context.customInstructions}`);
  }

  return sections.filter(Boolean).join("\n\n");
};

/**
 * Build prompt with model info for debugging
 */
export const buildSystemPromptWithInfo = (context: PromptContext): {
  prompt: string;
  tier: ModelTier;
  provider: ModelProvider;
  params: ModelParams;
} => {
  const tier = detectModelTier(context.modelId);
  const provider = detectModelProvider(context.modelId);
  const params = getModelParams(context.modelId);
  const prompt = buildSystemPrompt(context);

  return { prompt, tier, provider, params };
};

