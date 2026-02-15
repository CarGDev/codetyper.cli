/**
 * Unified Agent Registry
 *
 * Maps agents/skills from different AI coding tools:
 * - Claude Code
 * - OpenCode
 * - Cursor
 * - CodeTyper native
 *
 * This registry enables CodeTyper to use agent patterns from all tools.
 */

import type { AgentDefinition } from "@/types/agent-definition";

/**
 * Agent tier determines model selection and capabilities
 */
export type AgentTier = "fast" | "balanced" | "thorough" | "reasoning";

/**
 * Agent mode determines when/how the agent can be invoked
 */
export type AgentMode = "primary" | "subagent" | "all";

/**
 * Source tool that defined this agent pattern
 */
export type AgentSource =
  | "claude-code"
  | "opencode"
  | "cursor"
  | "codetyper"
  | "github-copilot";

/**
 * Unified agent definition that can represent agents from any tool
 */
export interface UnifiedAgentDefinition {
  /** Unique agent identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of agent capabilities */
  description: string;
  /** Source tool this agent pattern comes from */
  source: AgentSource;
  /** Agent tier for model selection */
  tier: AgentTier;
  /** Agent mode (primary, subagent, or both) */
  mode: AgentMode;
  /** Tools this agent has access to */
  tools: string[];
  /** Tools explicitly denied */
  deniedTools?: string[];
  /** Maximum iterations/turns */
  maxTurns: number;
  /** Custom system prompt */
  systemPrompt?: string;
  /** Temperature for model (0.0-1.0) */
  temperature?: number;
  /** Whether agent is visible in UI */
  hidden?: boolean;
  /** Color for UI display */
  color?: string;
  /** Tags for categorization */
  tags: string[];
}

// =============================================================================
// OpenCode Agents
// =============================================================================

export const OPENCODE_AGENTS: UnifiedAgentDefinition[] = [
  {
    id: "opencode-build",
    name: "Build",
    description:
      "The default agent. Executes tools based on configured permissions. Full code generation and modification capabilities.",
    source: "opencode",
    tier: "balanced",
    mode: "primary",
    tools: [
      "bash",
      "read",
      "glob",
      "grep",
      "edit",
      "write",
      "web_fetch",
      "web_search",
      "task_agent",
      "todo_read",
      "todo_write",
      "apply_patch",
    ],
    maxTurns: 50,
    tags: ["code-generation", "editing", "general-purpose"],
  },
  {
    id: "opencode-plan",
    name: "Plan",
    description:
      "Plan mode. Disallows all edit tools. Use for planning and research without file modifications.",
    source: "opencode",
    tier: "balanced",
    mode: "primary",
    tools: ["bash", "read", "glob", "grep", "web_fetch", "web_search"],
    deniedTools: ["edit", "write", "apply_patch"],
    maxTurns: 30,
    tags: ["planning", "research", "read-only"],
  },
  {
    id: "opencode-explore",
    name: "Explore",
    description:
      "Fast agent specialized for exploring codebases. Use for finding files by patterns, searching code for keywords, or answering questions about the codebase. Supports thoroughness levels: quick, medium, very thorough.",
    source: "opencode",
    tier: "fast",
    mode: "subagent",
    tools: ["grep", "glob", "read", "bash", "web_fetch", "web_search"],
    deniedTools: ["edit", "write", "apply_patch", "task_agent"],
    maxTurns: 15,
    tags: ["exploration", "search", "codebase-analysis"],
  },
  {
    id: "opencode-general",
    name: "General",
    description:
      "General-purpose agent for researching complex questions and executing multi-step tasks. Use to execute multiple units of work in parallel.",
    source: "opencode",
    tier: "balanced",
    mode: "subagent",
    tools: [
      "bash",
      "read",
      "glob",
      "grep",
      "edit",
      "write",
      "web_fetch",
      "web_search",
      "task_agent",
      "apply_patch",
    ],
    deniedTools: ["todo_read", "todo_write"],
    maxTurns: 25,
    tags: ["general-purpose", "parallel", "research"],
  },
  {
    id: "opencode-title",
    name: "Title Generator",
    description: "Session title generator. Internal use only.",
    source: "opencode",
    tier: "fast",
    mode: "primary",
    tools: [],
    maxTurns: 1,
    temperature: 0.5,
    hidden: true,
    tags: ["internal", "utility"],
  },
  {
    id: "opencode-summary",
    name: "Summary",
    description: "Conversation summarizer. Internal use only.",
    source: "opencode",
    tier: "fast",
    mode: "primary",
    tools: [],
    maxTurns: 1,
    hidden: true,
    tags: ["internal", "utility"],
  },
  {
    id: "opencode-compaction",
    name: "Compaction",
    description: "Internal message compaction agent.",
    source: "opencode",
    tier: "fast",
    mode: "primary",
    tools: [],
    maxTurns: 1,
    hidden: true,
    tags: ["internal", "utility"],
  },
];

// =============================================================================
// Claude Code Agents
// =============================================================================

export const CLAUDE_CODE_AGENTS: UnifiedAgentDefinition[] = [
  // Feature-Dev Plugin Agents
  {
    id: "claude-code-explorer",
    name: "Code Explorer",
    description:
      "Deeply analyzes existing codebase features by tracing execution paths, mapping architecture layers, understanding patterns and abstractions, and documenting dependencies.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read", "web_fetch", "web_search", "todo_write"],
    deniedTools: ["edit", "write", "bash"],
    maxTurns: 15,
    color: "yellow",
    tags: ["exploration", "analysis", "feature-dev"],
  },
  {
    id: "claude-code-architect",
    name: "Code Architect",
    description:
      "Designs feature architectures by analyzing existing codebase patterns and conventions, providing comprehensive implementation blueprints with specific files to create/modify.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read", "web_fetch", "web_search", "todo_write"],
    deniedTools: ["edit", "write", "bash"],
    maxTurns: 15,
    color: "green",
    tags: ["architecture", "design", "feature-dev"],
  },
  {
    id: "claude-code-reviewer",
    name: "Code Reviewer",
    description:
      "Reviews code for bugs, logic errors, security vulnerabilities, code quality issues, and adherence to project conventions using confidence-based filtering.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read", "web_fetch", "web_search"],
    deniedTools: ["edit", "write", "bash"],
    maxTurns: 10,
    color: "red",
    tags: ["review", "quality", "security"],
  },
  // PR Review Toolkit Agents
  {
    id: "claude-pr-reviewer",
    name: "PR Reviewer",
    description:
      "Reviews code for adherence to project guidelines, style guides, and best practices using confidence-based scoring.",
    source: "claude-code",
    tier: "thorough",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    maxTurns: 10,
    color: "green",
    tags: ["pr-review", "quality"],
  },
  {
    id: "claude-code-simplifier",
    name: "Code Simplifier",
    description:
      "Simplifies code for clarity, consistency, and maintainability while preserving all functionality.",
    source: "claude-code",
    tier: "thorough",
    mode: "subagent",
    tools: ["glob", "grep", "read", "edit", "write"],
    maxTurns: 15,
    tags: ["refactoring", "simplification"],
  },
  {
    id: "claude-comment-analyzer",
    name: "Comment Analyzer",
    description:
      "Analyzes code comments for accuracy, completeness, and long-term maintainability.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    maxTurns: 10,
    color: "green",
    tags: ["documentation", "comments", "quality"],
  },
  {
    id: "claude-test-analyzer",
    name: "Test Analyzer",
    description:
      "Reviews code for test coverage quality and completeness, focusing on behavioral coverage.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    maxTurns: 10,
    color: "cyan",
    tags: ["testing", "coverage", "quality"],
  },
  {
    id: "claude-silent-failure-hunter",
    name: "Silent Failure Hunter",
    description:
      "Identifies silent failures, inadequate error handling, and inappropriate fallback behavior.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    maxTurns: 10,
    color: "yellow",
    tags: ["error-handling", "reliability", "quality"],
  },
  {
    id: "claude-type-analyzer",
    name: "Type Design Analyzer",
    description:
      "Analyzes type design for encapsulation quality, invariant expression, and practical usefulness.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    maxTurns: 10,
    color: "pink",
    tags: ["types", "design", "quality"],
  },
  // Plugin Dev Agents
  {
    id: "claude-agent-creator",
    name: "Agent Creator",
    description:
      "Creates high-performance agent configurations from user requirements.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["write", "read"],
    maxTurns: 10,
    color: "magenta",
    tags: ["meta", "agent-creation"],
  },
  {
    id: "claude-plugin-validator",
    name: "Plugin Validator",
    description:
      "Validates plugin structure, configuration, and components including manifests and hooks.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["read", "grep", "glob", "bash"],
    maxTurns: 10,
    color: "yellow",
    tags: ["validation", "plugins"],
  },
  {
    id: "claude-skill-reviewer",
    name: "Skill Reviewer",
    description:
      "Reviews and improves skills for maximum effectiveness and reliability.",
    source: "claude-code",
    tier: "balanced",
    mode: "subagent",
    tools: ["read", "grep", "glob"],
    maxTurns: 10,
    color: "cyan",
    tags: ["review", "skills"],
  },
];

// =============================================================================
// Cursor Agents
// =============================================================================

export const CURSOR_AGENTS: UnifiedAgentDefinition[] = [
  {
    id: "cursor-pair-programmer",
    name: "Pair Programmer",
    description:
      "Default Cursor agent with pair-level context awareness. Automatic context attachment for open files, cursor position, edit history, and linter errors.",
    source: "cursor",
    tier: "balanced",
    mode: "primary",
    tools: ["glob", "grep", "read", "edit", "write", "bash", "web_search"],
    maxTurns: 50,
    tags: ["general-purpose", "pair-programming"],
    systemPrompt: `You are a pair programmer. Keep going until the query is completely resolved.
Use codebase_search (semantic) as the primary exploration tool.
Maximize parallel tool calls where possible.
Never output code unless requested - use edit tools instead.`,
  },
  {
    id: "cursor-cli",
    name: "CLI Agent",
    description:
      "Interactive CLI agent for software engineering tasks. Uses Grep as main exploration tool with status updates and flow-based execution.",
    source: "cursor",
    tier: "balanced",
    mode: "primary",
    tools: ["glob", "grep", "read", "edit", "write", "bash", "web_search"],
    maxTurns: 50,
    tags: ["cli", "terminal", "interactive"],
    systemPrompt: `You are an interactive CLI tool for software engineering tasks.
Flow: Goal detection → Discovery → Tool batching → Summary
Primary Tool: Grep (fast exact matching)
Provide status updates and concise summaries.`,
  },
  {
    id: "cursor-chat",
    name: "Chat",
    description:
      "Conversational coding assistant focused on question answering. Only edits if certain user wants edits.",
    source: "cursor",
    tier: "balanced",
    mode: "primary",
    tools: ["glob", "grep", "read", "web_search"],
    deniedTools: ["edit", "write"],
    maxTurns: 20,
    tags: ["chat", "q&a", "conversational"],
  },
];

// =============================================================================
// CodeTyper Native Agents
// =============================================================================

export const CODETYPER_AGENTS: UnifiedAgentDefinition[] = [
  {
    id: "codetyper-explore",
    name: "Explore",
    description: "Fast codebase exploration agent (read-only).",
    source: "codetyper",
    tier: "fast",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    deniedTools: ["edit", "write", "bash"],
    maxTurns: 10,
    tags: ["exploration", "search"],
  },
  {
    id: "codetyper-implement",
    name: "Implement",
    description: "Code writing and modification agent.",
    source: "codetyper",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read", "write", "edit", "bash"],
    maxTurns: 20,
    tags: ["implementation", "coding"],
  },
  {
    id: "codetyper-test",
    name: "Test",
    description: "Test creation and execution agent.",
    source: "codetyper",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read", "write", "edit", "bash"],
    maxTurns: 15,
    tags: ["testing", "quality"],
  },
  {
    id: "codetyper-review",
    name: "Review",
    description: "Code review and suggestions agent.",
    source: "codetyper",
    tier: "balanced",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    deniedTools: ["edit", "write", "bash"],
    maxTurns: 10,
    tags: ["review", "quality"],
  },
  {
    id: "codetyper-refactor",
    name: "Refactor",
    description: "Code refactoring and improvement agent.",
    source: "codetyper",
    tier: "thorough",
    mode: "subagent",
    tools: ["glob", "grep", "read", "write", "edit"],
    maxTurns: 25,
    tags: ["refactoring", "improvement"],
  },
  {
    id: "codetyper-plan",
    name: "Plan",
    description: "Planning and architecture design agent.",
    source: "codetyper",
    tier: "thorough",
    mode: "subagent",
    tools: ["glob", "grep", "read"],
    deniedTools: ["edit", "write", "bash"],
    maxTurns: 15,
    tags: ["planning", "architecture"],
  },
];

// =============================================================================
// Combined Registry
// =============================================================================

/**
 * All agents from all sources
 */
export const UNIFIED_AGENT_REGISTRY: UnifiedAgentDefinition[] = [
  ...OPENCODE_AGENTS,
  ...CLAUDE_CODE_AGENTS,
  ...CURSOR_AGENTS,
  ...CODETYPER_AGENTS,
];

/**
 * Get agent by ID
 */
export const getAgentById = (
  id: string,
): UnifiedAgentDefinition | undefined => {
  return UNIFIED_AGENT_REGISTRY.find((a) => a.id === id);
};

/**
 * Get agents by source
 */
export const getAgentsBySource = (
  source: AgentSource,
): UnifiedAgentDefinition[] => {
  return UNIFIED_AGENT_REGISTRY.filter((a) => a.source === source);
};

/**
 * Get agents by tier
 */
export const getAgentsByTier = (tier: AgentTier): UnifiedAgentDefinition[] => {
  return UNIFIED_AGENT_REGISTRY.filter((a) => a.tier === tier);
};

/**
 * Get agents by mode
 */
export const getAgentsByMode = (mode: AgentMode): UnifiedAgentDefinition[] => {
  return UNIFIED_AGENT_REGISTRY.filter(
    (a) => a.mode === mode || a.mode === "all",
  );
};

/**
 * Get agents by tag
 */
export const getAgentsByTag = (tag: string): UnifiedAgentDefinition[] => {
  return UNIFIED_AGENT_REGISTRY.filter((a) => a.tags.includes(tag));
};

/**
 * Get visible agents only
 */
export const getVisibleAgents = (): UnifiedAgentDefinition[] => {
  return UNIFIED_AGENT_REGISTRY.filter((a) => !a.hidden);
};

/**
 * Get subagents only (for task_agent tool)
 */
export const getSubagents = (): UnifiedAgentDefinition[] => {
  return UNIFIED_AGENT_REGISTRY.filter(
    (a) => (a.mode === "subagent" || a.mode === "all") && !a.hidden,
  );
};

/**
 * Map unified tier to internal tier (internal doesn't have "reasoning")
 */
const mapTier = (tier: AgentTier): "fast" | "balanced" | "thorough" => {
  const tierMap: Record<AgentTier, "fast" | "balanced" | "thorough"> = {
    fast: "fast",
    balanced: "balanced",
    thorough: "thorough",
    reasoning: "thorough", // Map reasoning to thorough
  };
  return tierMap[tier];
};

/**
 * Map unified color to internal color
 */
const mapColor = (
  color?: string,
):
  | "red"
  | "green"
  | "blue"
  | "yellow"
  | "cyan"
  | "magenta"
  | "white"
  | "gray" => {
  const validColors = new Set([
    "red",
    "green",
    "blue",
    "yellow",
    "cyan",
    "magenta",
    "white",
    "gray",
  ]);
  if (color && validColors.has(color)) {
    return color as
      | "red"
      | "green"
      | "blue"
      | "yellow"
      | "cyan"
      | "magenta"
      | "white"
      | "gray";
  }
  return "cyan";
};

/**
 * Convert unified agent to internal AgentDefinition format
 */
export const toAgentDefinition = (
  agent: UnifiedAgentDefinition,
): AgentDefinition => ({
  name: agent.id,
  description: agent.description,
  tools: agent.tools,
  tier: mapTier(agent.tier),
  color: mapColor(agent.color),
  maxTurns: agent.maxTurns,
  systemPrompt: agent.systemPrompt,
});

/**
 * Summary statistics
 */
export const REGISTRY_STATS = {
  total: UNIFIED_AGENT_REGISTRY.length,
  bySource: {
    opencode: OPENCODE_AGENTS.length,
    "claude-code": CLAUDE_CODE_AGENTS.length,
    cursor: CURSOR_AGENTS.length,
    codetyper: CODETYPER_AGENTS.length,
  },
  byTier: {
    fast: UNIFIED_AGENT_REGISTRY.filter((a) => a.tier === "fast").length,
    balanced: UNIFIED_AGENT_REGISTRY.filter((a) => a.tier === "balanced")
      .length,
    thorough: UNIFIED_AGENT_REGISTRY.filter((a) => a.tier === "thorough")
      .length,
    reasoning: UNIFIED_AGENT_REGISTRY.filter((a) => a.tier === "reasoning")
      .length,
  },
  byMode: {
    primary: UNIFIED_AGENT_REGISTRY.filter((a) => a.mode === "primary").length,
    subagent: UNIFIED_AGENT_REGISTRY.filter((a) => a.mode === "subagent")
      .length,
    all: UNIFIED_AGENT_REGISTRY.filter((a) => a.mode === "all").length,
  },
};
