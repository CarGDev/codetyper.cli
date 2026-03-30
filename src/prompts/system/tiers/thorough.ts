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
- Call multiple tools in a single response to maximize efficiency
- Complete features end-to-end: discover → plan → implement → verify

Only consult user for: architectural trade-offs, business logic ambiguity, security decisions, or changes affecting external systems.`;

export const THOROUGH_TIER_PLAN_MODE = `## Plan Approval

For tasks affecting 5+ files, use plan_approval tool:
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
  // Verified working via API test 2026-03-30
  "claude-opus-4.5",
  "claude-opus-4.6",
  "gpt-5.2",
  "gpt-5.1",
] as const;

export type ThoroughTierModel = (typeof THOROUGH_TIER_MODELS)[number];

export const isThoroughTierModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();
  return THOROUGH_TIER_MODELS.some(
    (m) => lowerModel.includes(m.toLowerCase()),
  ) || lowerModel.includes("opus");
};
