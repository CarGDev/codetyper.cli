export interface AgentFrontmatter {
  name?: string;
  description?: string;
  mode?: "primary" | "subagent" | "all";
  model?: string;
  temperature?: number;
  topP?: number;
  hidden?: boolean;
  color?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  filePath: string;
  mode: "primary" | "subagent" | "all";
  model?: string;
  temperature?: number;
  topP?: number;
  hidden?: boolean;
  color?: string;
}

export interface AgentRegistry {
  agents: Map<string, AgentConfig>;
  defaultAgent: string | null;
}
