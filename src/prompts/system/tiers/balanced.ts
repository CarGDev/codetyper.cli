/**
 * Balanced Tier Prompt - For standard capability models
 *
 * Models: gpt-4o, gpt-4-turbo, claude-sonnet, gemini-pro
 *
 * Strategy:
 * - Full tool access
 * - Chain-of-thought reasoning
 * - Parallel tool execution allowed
 * - Plan mode for complex tasks
 * - Agent delegation for multi-step work
 */

import { buildBasePrompt } from "@prompts/system/base";

export const BALANCED_TIER_INSTRUCTIONS = `## Workflow

Every response MUST include tool calls unless the user is explicitly asking a knowledge question.

Process: read → edit → verify. Call multiple tools in one response when possible.

Only ask ONE question when: fundamentally different approaches, missing credentials, or irreversible changes.`;

export const BALANCED_TIER_PLAN_GATE = `## Plan Approval

Plan approval is reserved for larger or high-risk changes. For tasks affecting 5+ files or involving architectural, database, security, or irreversible changes, use the plan_approval tool:
1. analyze_task → check if approval needed
2. create → title + summary
3. add_step → for each phase (title, description, files_affected, risk_level)
4. submit → WAIT for user approval before modifying files

Skip for: single-file fixes, minor refactors, docs, config, formatting changes, and quick bugfixes.`;

export const BALANCED_TIER_AGENTS = `## Agent Delegation

Use task_agent tool to spawn sub-agents: explore (read-only), implement, test, review.
Delegate for deep exploration or parallel investigations. Don't delegate simple 2-3 tool call tasks.`;

/**
 * Build the complete balanced tier prompt
 */
export const buildBalancedTierPrompt = (): string => {
  return [
    buildBasePrompt(),
    BALANCED_TIER_INSTRUCTIONS,
    BALANCED_TIER_PLAN_GATE,
    BALANCED_TIER_AGENTS,
  ].join("\n\n");
};

/**
 * Models that should use this tier
 * Based on Copilot's model cost multipliers:
 * - Unlimited (0x): gpt-4o (flagship unlimited)
 * - Standard (1.0x): most capable models
 */
export const BALANCED_TIER_MODELS = [
  // Verified working via API test 2026-03-30
  "gpt-4o",
  "gpt-4.1",
  "gpt-5-mini",
  "claude-sonnet-4",
  "claude-sonnet-4.5",
  "claude-sonnet-4.6",
  "gemini-2.5-pro",
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gpt-5.1",
  "gpt-5.2",
  "grok-code-fast-1",
  "claude-haiku-4.5",
] as const;

export type BalancedTierModel = (typeof BALANCED_TIER_MODELS)[number];

export const isBalancedTierModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();
  // Thorough tier takes priority
  if (lowerModel.includes("opus")) return false;
  // Everything else is balanced (fast tier doesn't have a separate prompt)
  return BALANCED_TIER_MODELS.some(
    (m) => lowerModel.includes(m.toLowerCase()),
  );
};
