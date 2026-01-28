/**
 * Project Config Types
 */

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  model?: string;
  tools?: string[];
}

export interface SkillConfig {
  name: string;
  description: string;
  command: string;
  prompt: string;
}

export interface RuleConfig {
  name: string;
  pattern?: string;
  content: string;
  priority?: number;
}

export interface LearningEntry {
  id: string;
  content: string;
  context?: string;
  createdAt: number;
  tags?: string[];
}

export interface ProjectSettings {
  defaultModel?: string;
  defaultProvider?: string;
  autoApprove?: string[];
  ignorePaths?: string[];
}
