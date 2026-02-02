/**
 * Agent markdown definition types
 * Agents are defined in markdown files with YAML frontmatter
 * Location: .codetyper/agents/*.md
 */

export type AgentTier = "fast" | "balanced" | "thorough";

export type AgentColor =
  | "red"
  | "green"
  | "blue"
  | "yellow"
  | "cyan"
  | "magenta"
  | "white"
  | "gray";

export interface AgentDefinition {
  readonly name: string;
  readonly description: string;
  readonly tools: ReadonlyArray<string>;
  readonly tier: AgentTier;
  readonly color: AgentColor;
  readonly maxTurns?: number;
  readonly systemPrompt?: string;
  readonly triggerPhrases?: ReadonlyArray<string>;
  readonly capabilities?: ReadonlyArray<string>;
  readonly permissions?: AgentPermissions;
}

export interface AgentPermissions {
  readonly allowedPaths?: ReadonlyArray<string>;
  readonly deniedPaths?: ReadonlyArray<string>;
  readonly allowedTools?: ReadonlyArray<string>;
  readonly deniedTools?: ReadonlyArray<string>;
  readonly requireApproval?: ReadonlyArray<string>;
}

export interface AgentDefinitionFile {
  readonly filePath: string;
  readonly frontmatter: AgentFrontmatter;
  readonly content: string;
  readonly parsed: AgentDefinition;
}

export interface AgentFrontmatter {
  readonly name: string;
  readonly description: string;
  readonly tools: ReadonlyArray<string>;
  readonly tier?: AgentTier;
  readonly color?: AgentColor;
  readonly maxTurns?: number;
  readonly triggerPhrases?: ReadonlyArray<string>;
  readonly capabilities?: ReadonlyArray<string>;
  readonly allowedPaths?: ReadonlyArray<string>;
  readonly deniedPaths?: ReadonlyArray<string>;
}

export interface AgentRegistry {
  readonly agents: ReadonlyMap<string, AgentDefinition>;
  readonly byTrigger: ReadonlyMap<string, string>;
  readonly byCapability: ReadonlyMap<string, ReadonlyArray<string>>;
}

export interface AgentLoadResult {
  readonly success: boolean;
  readonly agent?: AgentDefinition;
  readonly error?: string;
  readonly filePath: string;
}

export const DEFAULT_AGENT_DEFINITION: Partial<AgentDefinition> = {
  tier: "balanced",
  color: "cyan",
  maxTurns: 10,
  tools: ["read", "glob", "grep"],
  capabilities: [],
  triggerPhrases: [],
};

export const AGENT_TIER_MODELS: Record<AgentTier, string> = {
  fast: "gpt-4o-mini",
  balanced: "gpt-4o",
  thorough: "o1",
};

export const AGENT_DEFINITION_SCHEMA = {
  required: ["name", "description", "tools"],
  optional: ["tier", "color", "maxTurns", "triggerPhrases", "capabilities", "allowedPaths", "deniedPaths"],
};
