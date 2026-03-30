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

export const BALANCED_TIER_INSTRUCTIONS = `## Balanced Model Instructions

Act immediately. Don't ask for confirmation — make reasonable assumptions and start working.

Only ask when: fundamentally different approaches with significant trade-offs, missing credentials, or irreversible changes. If you must ask, do non-blocked work first and ask ONE targeted question.

Process: read relevant files → make changes → verify. Use parallel tool calls for independent operations. Use todo_write for 5+ step tasks.

Don't: ask "should I proceed?", list plans without executing, add features beyond request, add comments to unchanged code.`;

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
  // Copilot Unlimited flagship
  "gpt-4o",

  // Copilot Standard (1.0x)
  "claude-sonnet-4",
  "claude-sonnet-4.5",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  "gpt-4.1",
  "gpt-5",
  "gpt-5-codex-preview",
  "gpt-5.1",
  "gpt-5.1-codex",

  // Other balanced models
  "gpt-4-turbo",
  "gpt-4",
  "claude-3-sonnet",
  "claude-sonnet",
  "claude-3.5-sonnet",
  "gemini-pro",
  "gemini-1.5-pro",
  "gemini-2.0-pro",
  "llama-3.1-70b",
  "llama-3.2-70b",
  "mistral-large",
  "qwen-72b",
  "deepseek-v2",
] as const;

export type BalancedTierModel = (typeof BALANCED_TIER_MODELS)[number];

export const isBalancedTierModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();

  // Check for fast tier first (they often contain 'pro' in name too)
  if (lowerModel.includes("mini") || lowerModel.includes("flash") || lowerModel.includes("raptor")) {
    return false;
  }

  // Check for thorough tier
  if (lowerModel.includes("opus") || lowerModel.includes("o1") || lowerModel.includes("ultra") ||
      lowerModel.includes("codex-max") || lowerModel.includes("5.2")) {
    return false;
  }

  return BALANCED_TIER_MODELS.some(
    (m) => lowerModel.includes(m.toLowerCase())
  ) || lowerModel.includes("pro") || lowerModel.includes("sonnet") || lowerModel.includes("turbo");
};
