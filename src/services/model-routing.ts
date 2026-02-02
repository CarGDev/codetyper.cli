/**
 * Model Routing Service
 *
 * Maps agent tiers to appropriate models based on task complexity.
 * Following Claude Code's multi-model strategy:
 * - fast: Quick screening, filtering (like Haiku)
 * - balanced: Detailed analysis, general tasks (like Sonnet)
 * - thorough: Complex reasoning, bug hunting (like Opus)
 */

import { getModelContextSize } from "@constants/copilot";
import type { AgentConfig } from "@/types/agent-config";

/**
 * Model tier for routing decisions
 */
export type ModelTier = "fast" | "balanced" | "thorough";

/**
 * Model tier mapping to Copilot models
 * These are the default mappings - can be overridden by agent config
 */
export const MODEL_TIER_MAPPING: Record<ModelTier, string[]> = {
  // Fast tier: Low cost, quick responses (0x or 0.33x multiplier)
  fast: [
    "gpt-5-mini",
    "gpt-4o-mini",
    "claude-haiku-4.5",
    "gemini-3-flash-preview",
    "grok-code-fast-1",
  ],
  // Balanced tier: Good quality, moderate cost (1x multiplier)
  balanced: [
    "claude-sonnet-4.5",
    "claude-sonnet-4",
    "gpt-5",
    "gpt-5.1",
    "gemini-2.5-pro",
    "gpt-4.1",
  ],
  // Thorough tier: Best quality, higher cost (3x multiplier)
  thorough: [
    "claude-opus-4.5",
    "gpt-5.2-codex",
    "gpt-5.1-codex-max",
  ],
};

/**
 * Tier aliases for agent frontmatter
 */
const TIER_ALIASES: Record<string, ModelTier> = {
  haiku: "fast",
  fast: "fast",
  quick: "fast",
  sonnet: "balanced",
  balanced: "balanced",
  default: "balanced",
  opus: "thorough",
  thorough: "thorough",
  deep: "thorough",
};

/**
 * Agent type to default tier mapping
 */
const AGENT_TYPE_TIERS: Record<string, ModelTier> = {
  explorer: "fast",
  explore: "fast",
  filter: "fast",
  screen: "fast",
  architect: "balanced",
  planner: "balanced",
  plan: "balanced",
  coder: "balanced",
  general: "balanced",
  reviewer: "balanced",
  review: "balanced",
  "code-reviewer": "balanced",
  "bug-hunter": "thorough",
  bugs: "thorough",
  security: "thorough",
  compaction: "fast",
  summary: "fast",
  title: "fast",
};

/**
 * Resolve model tier from string (tier name or model ID)
 */
export const resolveTier = (modelOrTier: string): ModelTier | null => {
  const lower = modelOrTier.toLowerCase();

  // Check if it's a tier alias
  if (lower in TIER_ALIASES) {
    return TIER_ALIASES[lower];
  }

  // Check if it's already a model ID in one of the tiers
  for (const [tier, models] of Object.entries(MODEL_TIER_MAPPING)) {
    if (models.some((m) => m.toLowerCase() === lower)) {
      return tier as ModelTier;
    }
  }

  return null;
};

/**
 * Get the best available model for a tier
 * Returns the first model in the tier's list (assumed to be preference order)
 */
export const getModelForTier = (
  tier: ModelTier,
  availableModels?: string[],
): string => {
  const tierModels = MODEL_TIER_MAPPING[tier];

  if (availableModels && availableModels.length > 0) {
    // Find first available model from tier
    for (const model of tierModels) {
      if (availableModels.includes(model)) {
        return model;
      }
    }
    // Fallback to first tier model if none available
    return tierModels[0];
  }

  return tierModels[0];
};

/**
 * Infer tier from agent type/name
 */
export const inferTierFromAgent = (agent: AgentConfig): ModelTier => {
  const idLower = agent.id.toLowerCase();
  const nameLower = agent.name.toLowerCase();

  // Check agent type mapping
  for (const [type, tier] of Object.entries(AGENT_TYPE_TIERS)) {
    if (idLower.includes(type) || nameLower.includes(type)) {
      return tier;
    }
  }

  // Default to balanced
  return "balanced";
};

/**
 * Resolve the model to use for an agent
 *
 * Priority:
 * 1. Explicit model in agent config (full model ID)
 * 2. Tier specified in agent config (fast/balanced/thorough)
 * 3. Inferred from agent type/name
 * 4. Default model passed in
 */
export const resolveAgentModel = (
  agent: AgentConfig,
  defaultModel: string,
  availableModels?: string[],
): { model: string; tier: ModelTier; source: string } => {
  // 1. Check explicit model in agent config
  if (agent.model) {
    // Check if it's a tier name
    const tier = resolveTier(agent.model);
    if (tier) {
      const model = getModelForTier(tier, availableModels);
      return { model, tier, source: "agent-tier" };
    }

    // Otherwise use as model ID
    return {
      model: agent.model,
      tier: resolveTier(agent.model) ?? "balanced",
      source: "agent-model",
    };
  }

  // 2. Infer from agent type
  const inferredTier = inferTierFromAgent(agent);
  if (inferredTier !== "balanced") {
    const model = getModelForTier(inferredTier, availableModels);
    return { model, tier: inferredTier, source: "agent-inferred" };
  }

  // 3. Use default
  const defaultTier = resolveTier(defaultModel) ?? "balanced";
  return { model: defaultModel, tier: defaultTier, source: "default" };
};

/**
 * Get model context size for routing decisions
 */
export const getRouteContextSize = (modelId: string): number => {
  return getModelContextSize(modelId).input;
};

/**
 * Model routing decision
 */
export interface ModelRoutingDecision {
  model: string;
  tier: ModelTier;
  source: string;
  contextSize: number;
}

/**
 * Make routing decision for an agent
 */
export const routeAgent = (
  agent: AgentConfig,
  defaultModel: string,
  availableModels?: string[],
): ModelRoutingDecision => {
  const resolution = resolveAgentModel(agent, defaultModel, availableModels);

  return {
    ...resolution,
    contextSize: getRouteContextSize(resolution.model),
  };
};
