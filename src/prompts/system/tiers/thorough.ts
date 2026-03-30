/**
 * Thorough Tier Prompt - For most capable models
 *
 * Models: gpt-5, o1, o1-pro, claude-opus, gemini-ultra
 *
 * Strategy:
 * - Full autonomy and complex reasoning
 * - Multi-agent orchestration
 * - Advanced planning with parallel exploration
 * - Deep codebase understanding
 * - Architectural decision making
 */

import { buildBasePrompt } from "@prompts/system/base";

export const THOROUGH_TIER_INSTRUCTIONS = `## Thorough Model Instructions

You have FULL AUTONOMY for complex, multi-step tasks.

- Make architectural decisions confidently
- Use task_agent tool to spawn explore/implement/test/review agents in parallel
- Handle ambiguity through exploration, not questions
- Complete features end-to-end: discover → plan → implement → verify

Only consult user for: architectural trade-offs, business logic ambiguity, security decisions, or changes affecting external systems.`;

export const THOROUGH_TIER_PLAN_MODE = `## Plan Approval

For tasks affecting 3+ files, use plan_approval tool:
1. analyze_task → check if approval needed
2. create → title + summary
3. add_step → for each phase (title, description, files_affected, risk_level)
4. submit → WAIT for user approval before modifying files

Skip for: single-file fixes, docs, config changes.`;

export const THOROUGH_TIER_AGENTS = `## Agent System

Use task_agent tool to spawn sub-agents. Types: explore (read-only), implement (code changes), test, review, refactor, plan.

Patterns:
- Fan-out: spawn multiple explore agents → synthesize → plan → implement
- Pipeline: explore → plan → implement → test → review
- Parallel: plan → implement-backend + implement-frontend + tests → integrate`;

/**
 * Build the complete thorough tier prompt
 */
export const buildThoroughTierPrompt = (): string => {
  return [
    buildBasePrompt(),
    THOROUGH_TIER_INSTRUCTIONS,
    THOROUGH_TIER_PLAN_MODE,
    THOROUGH_TIER_AGENTS,
  ].join("\n\n");
};

/**
 * Models that should use this tier
 * Based on Copilot's model cost multipliers:
 * - Premium (3.0x): most capable, expensive models
 * - Standard high-end: codex-max and 5.2 variants
 */
export const THOROUGH_TIER_MODELS = [
  // Copilot Premium (3.0x)
  "claude-opus-4.5",

  // Copilot Standard high-end
  "gpt-5.1-codex-max",
  "gpt-5.2",
  "gpt-5.2-codex",

  // Reasoning models
  "o1",
  "o1-pro",
  "o1-preview",
  "o3",
  "o3-mini",

  // Other thorough models
  "claude-opus",
  "claude-3-opus",
  "claude-4-opus",
  "gemini-ultra",
  "gemini-2.0-ultra",
  "llama-3.1-405b",
  "deepseek-r1",
] as const;

export type ThoroughTierModel = (typeof THOROUGH_TIER_MODELS)[number];

export const isThoroughTierModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();
  return THOROUGH_TIER_MODELS.some(
    (m) => lowerModel.includes(m.toLowerCase())
  ) || lowerModel.includes("opus") || lowerModel.includes("ultra") ||
    lowerModel.includes("o1") || lowerModel.includes("o3") ||
    lowerModel.includes("405b") || lowerModel.includes("r1") ||
    lowerModel.includes("codex-max") || lowerModel.includes("5.2");
};
