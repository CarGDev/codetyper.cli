/**
 * Skill System Types
 *
 * Types for the progressive disclosure skill system.
 * Skills are loaded in 3 levels: metadata → body → external references.
 * Supports built-in skills, project skills, and external agents
 * from .claude/, .github/, .codetyper/ directories.
 */

/**
 * Skill loading level for progressive disclosure
 */
export type SkillLoadLevel = "metadata" | "body" | "full";

/**
 * Skill trigger types
 */
export type SkillTriggerType =
  | "command" // /commit, /review
  | "pattern" // "commit changes", "review PR"
  | "auto" // Automatically triggered based on context
  | "explicit"; // Only when explicitly invoked

/**
 * Source of a skill definition
 */
export type SkillSource =
  | "builtin" // Ships with codetyper (src/skills/)
  | "user" // User-level (~/.config/codetyper/skills/)
  | "project" // Project-level (.codetyper/skills/)
  | "external-claude" // External from .claude/
  | "external-github" // External from .github/
  | "external-codetyper"; // External from .codetyper/ root agents

/**
 * Example for a skill
 */
export interface SkillExample {
  input: string;
  output: string;
  description?: string;
}

/**
 * Skill metadata (Level 1 - always loaded)
 */
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: string[];
  triggerType: SkillTriggerType;
  autoTrigger: boolean;
  requiredTools: string[];
  tags?: string[];
  source?: SkillSource;
}

/**
 * Skill body content (Level 2 - loaded on match)
 */
export interface SkillBody {
  systemPrompt: string;
  instructions: string;
  templates?: Record<string, string>;
}

/**
 * Full skill definition (Level 3 - loaded on execution)
 */
export interface SkillDefinition extends SkillMetadata, SkillBody {
  examples?: SkillExample[];
  externalRefs?: string[];
  loadedAt?: number;
}

/**
 * Skill match result from registry
 */
export interface SkillMatch {
  skill: SkillDefinition;
  confidence: number;
  matchedTrigger: string;
  matchType: SkillTriggerType;
}

/**
 * Auto-detected skill match (from prompt analysis)
 */
export interface AutoDetectedSkill {
  skill: SkillDefinition;
  confidence: number;
  /** Keywords in the prompt that triggered detection */
  matchedKeywords: string[];
  /** Category of the match (e.g., "language", "tool", "domain") */
  category: string;
}

/**
 * Skill execution context
 */
export interface SkillContext {
  sessionId: string;
  workingDir: string;
  gitBranch?: string;
  userInput: string;
  additionalContext?: Record<string, unknown>;
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  success: boolean;
  skillId: string;
  prompt: string;
  error?: string;
}

/**
 * Skill registry state
 */
export interface SkillRegistryState {
  skills: Map<string, SkillDefinition>;
  externalAgents: Map<string, SkillDefinition>;
  lastLoadedAt: number | null;
  loadErrors: string[];
}

/**
 * SKILL.md frontmatter parsed structure
 */
export interface SkillFrontmatter {
  id: string;
  name: string;
  description: string;
  version?: string;
  triggers: string[];
  triggerType?: SkillTriggerType;
  autoTrigger?: boolean;
  requiredTools?: string[];
  tags?: string[];
}

/**
 * Parsed SKILL.md file
 */
export interface ParsedSkillFile {
  frontmatter: SkillFrontmatter;
  body: string;
  examples?: SkillExample[];
  filePath: string;
}

/**
 * External agent file (from .claude/, .github/, .codetyper/)
 */
export interface ExternalAgentFile {
  /** Relative path within the source directory */
  relativePath: string;
  /** Absolute path to the file */
  absolutePath: string;
  /** Source directory type */
  source: SkillSource;
  /** Raw file content */
  content: string;
}

/**
 * Parsed external agent definition
 */
export interface ParsedExternalAgent {
  /** Derived ID from filename/path */
  id: string;
  /** Description from frontmatter */
  description: string;
  /** Tools specified in frontmatter */
  tools: string[];
  /** Body content (instructions) */
  body: string;
  /** Source of this agent */
  source: SkillSource;
  /** Original file path */
  filePath: string;
}
