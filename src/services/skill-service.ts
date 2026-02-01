/**
 * Skill Service
 *
 * Handles skill detection and execution.
 * Skills are custom commands that expand into prompts.
 */

import { getSkills } from "@services/project-config";
import type { SkillConfig } from "@/types/project-config";

export interface SkillMatch {
  skill: SkillConfig;
  args: string;
}

export interface SkillExecutionResult {
  expandedPrompt: string;
  skill: SkillConfig;
}

let skillsCache: SkillConfig[] | null = null;

/**
 * Load and cache skills
 */
export const loadSkills = async (): Promise<SkillConfig[]> => {
  if (skillsCache) return skillsCache;
  skillsCache = await getSkills();
  return skillsCache;
};

/**
 * Refresh skills cache
 */
export const refreshSkills = async (): Promise<void> => {
  skillsCache = await getSkills();
};

/**
 * Detect if a message starts with a skill command
 * Skills are invoked with /command syntax
 */
export const detectSkillCommand = async (
  message: string,
): Promise<SkillMatch | null> => {
  const trimmed = message.trim();

  if (!trimmed.startsWith("/")) {
    return null;
  }

  const skills = await loadSkills();

  for (const skill of skills) {
    const commandPattern = `/${skill.command}`;

    if (
      trimmed === commandPattern ||
      trimmed.startsWith(`${commandPattern} `)
    ) {
      const args = trimmed.slice(commandPattern.length).trim();
      return { skill, args };
    }
  }

  return null;
};

/**
 * Execute a skill by expanding its prompt template
 * Supports $ARGS placeholder for arguments
 */
export const executeSkill = (
  skill: SkillConfig,
  args: string,
): SkillExecutionResult => {
  let expandedPrompt = skill.prompt;

  // Replace $ARGS placeholder with actual arguments
  expandedPrompt = expandedPrompt.replace(/\$ARGS/g, args);

  // Replace $1, $2, etc. with positional arguments
  const argParts = args.split(/\s+/).filter(Boolean);
  for (let i = 0; i < argParts.length; i++) {
    expandedPrompt = expandedPrompt.replace(
      new RegExp(`\\$${i + 1}`, "g"),
      argParts[i],
    );
  }

  // Clean up any remaining unreplaced placeholders
  expandedPrompt = expandedPrompt.replace(/\$\d+/g, "");
  expandedPrompt = expandedPrompt.replace(/\$ARGS/g, "");

  return {
    expandedPrompt: expandedPrompt.trim(),
    skill,
  };
};

/**
 * Get all available skill commands for display
 */
export const getAvailableSkills = async (): Promise<
  Array<{ command: string; name: string; description: string }>
> => {
  const skills = await loadSkills();
  return skills.map((s) => ({
    command: `/${s.command}`,
    name: s.name,
    description: s.description,
  }));
};

/**
 * Check if skills are available
 */
export const hasSkills = async (): Promise<boolean> => {
  const skills = await loadSkills();
  return skills.length > 0;
};
