/**
 * Skill Registry Service
 *
 * Manages skill registration, matching, and invocation.
 * Uses progressive disclosure to load skills on demand.
 */

import { SKILL_MATCHING, SKILL_LOADING, SKILL_ERRORS } from "@constants/skills";
import { loadAllSkills, loadSkillById } from "@services/skill-loader";
import type {
  SkillDefinition,
  SkillMatch,
  SkillContext,
  SkillExecutionResult,
  SkillRegistryState,
} from "@/types/skills";

// ============================================================================
// State Management
// ============================================================================

let registryState: SkillRegistryState = {
  skills: new Map(),
  lastLoadedAt: null,
  loadErrors: [],
};

/**
 * Get current registry state
 */
export const getRegistryState = (): SkillRegistryState => ({
  skills: new Map(registryState.skills),
  lastLoadedAt: registryState.lastLoadedAt,
  loadErrors: [...registryState.loadErrors],
});

/**
 * Check if cache is stale
 */
const isCacheStale = (): boolean => {
  if (!registryState.lastLoadedAt) return true;
  return Date.now() - registryState.lastLoadedAt > SKILL_LOADING.CACHE_TTL_MS;
};

// ============================================================================
// Skill Registration
// ============================================================================

/**
 * Initialize skill registry with all available skills
 */
export const initializeRegistry = async (): Promise<void> => {
  try {
    const skills = await loadAllSkills("metadata");
    registryState.skills.clear();
    registryState.loadErrors = [];

    for (const skill of skills) {
      registryState.skills.set(skill.id, skill);
    }

    registryState.lastLoadedAt = Date.now();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    registryState.loadErrors.push(message);
  }
};

/**
 * Register a skill manually
 */
export const registerSkill = (skill: SkillDefinition): void => {
  registryState.skills.set(skill.id, skill);
};

/**
 * Unregister a skill
 */
export const unregisterSkill = (skillId: string): boolean => {
  return registryState.skills.delete(skillId);
};

/**
 * Get a skill by ID
 */
export const getSkill = (skillId: string): SkillDefinition | undefined => {
  return registryState.skills.get(skillId);
};

/**
 * Get all registered skills
 */
export const getAllSkills = (): SkillDefinition[] => {
  return Array.from(registryState.skills.values());
};

/**
 * Refresh registry if cache is stale
 */
export const refreshIfNeeded = async (): Promise<void> => {
  if (isCacheStale()) {
    await initializeRegistry();
  }
};

// ============================================================================
// Skill Matching
// ============================================================================

/**
 * Calculate string similarity using Levenshtein distance
 */
const calculateSimilarity = (a: string, b: string): number => {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    return 0.8;
  }

  // Simple word overlap for fuzzy matching
  const aWords = new Set(aLower.split(/\s+/));
  const bWords = new Set(bLower.split(/\s+/));
  const intersection = [...aWords].filter((word) => bWords.has(word));

  if (intersection.length === 0) return 0;

  return intersection.length / Math.max(aWords.size, bWords.size);
};

/**
 * Check if input matches a trigger pattern
 */
const matchTrigger = (
  input: string,
  trigger: string,
): { matches: boolean; confidence: number } => {
  const inputLower = input.toLowerCase().trim();
  const triggerLower = trigger.toLowerCase().trim();

  // Exact match (command style)
  if (inputLower === triggerLower) {
    return { matches: true, confidence: 1.0 };
  }

  // Command prefix match
  if (trigger.startsWith(SKILL_MATCHING.COMMAND_PREFIX)) {
    if (inputLower.startsWith(triggerLower)) {
      return { matches: true, confidence: 0.95 };
    }
  }

  // Input starts with trigger
  if (inputLower.startsWith(triggerLower)) {
    return { matches: true, confidence: 0.9 };
  }

  // Fuzzy match
  const similarity = calculateSimilarity(inputLower, triggerLower);
  if (similarity >= SKILL_MATCHING.FUZZY_THRESHOLD) {
    return { matches: true, confidence: similarity };
  }

  return { matches: false, confidence: 0 };
};

/**
 * Find matching skills for user input
 */
export const findMatchingSkills = async (
  input: string,
): Promise<SkillMatch[]> => {
  await refreshIfNeeded();

  const matches: SkillMatch[] = [];
  const inputLower = input.toLowerCase().trim();

  for (const skill of registryState.skills.values()) {
    let bestMatch: { trigger: string; confidence: number } | null = null;

    for (const trigger of skill.triggers) {
      const result = matchTrigger(inputLower, trigger);

      if (result.matches) {
        if (!bestMatch || result.confidence > bestMatch.confidence) {
          bestMatch = { trigger, confidence: result.confidence };
        }
      }
    }

    if (bestMatch && bestMatch.confidence >= SKILL_MATCHING.MIN_CONFIDENCE) {
      matches.push({
        skill,
        confidence: bestMatch.confidence,
        matchedTrigger: bestMatch.trigger,
        matchType: skill.triggerType,
      });
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
};

/**
 * Find the best matching skill for input
 */
export const findBestMatch = async (
  input: string,
): Promise<SkillMatch | null> => {
  const matches = await findMatchingSkills(input);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Check if input matches a command pattern (starts with /)
 */
export const isCommandInput = (input: string): boolean => {
  return input.trim().startsWith(SKILL_MATCHING.COMMAND_PREFIX);
};

/**
 * Extract command name from input
 */
export const extractCommandName = (input: string): string | null => {
  if (!isCommandInput(input)) return null;

  const trimmed = input.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return trimmed.slice(1); // Remove leading /
  }

  return trimmed.slice(1, spaceIndex);
};

// ============================================================================
// Skill Execution
// ============================================================================

/**
 * Load full skill definition for execution
 */
export const loadSkillForExecution = async (
  skillId: string,
): Promise<SkillDefinition | null> => {
  // Check if already fully loaded
  const existing = registryState.skills.get(skillId);
  if (existing && existing.systemPrompt && existing.instructions) {
    return existing;
  }

  // Load full definition
  const fullSkill = await loadSkillById(skillId, "full");
  if (fullSkill) {
    registryState.skills.set(skillId, fullSkill);
    return fullSkill;
  }

  return null;
};

/**
 * Build prompt with skill context
 */
export const buildSkillPrompt = (
  skill: SkillDefinition,
  context: SkillContext,
): string => {
  const parts: string[] = [];

  // Add system prompt if present
  if (skill.systemPrompt) {
    parts.push(skill.systemPrompt);
  }

  // Add instructions
  if (skill.instructions) {
    parts.push("## Instructions\n" + skill.instructions);
  }

  // Add examples if present
  if (skill.examples && skill.examples.length > 0) {
    parts.push("## Examples");
    for (const example of skill.examples) {
      if (example.description) {
        parts.push(`### ${example.description}`);
      }
      parts.push(`Input: ${example.input}`);
      parts.push(`Output: ${example.output}`);
    }
  }

  // Add context
  parts.push("## Context");
  parts.push(`Working directory: ${context.workingDir}`);
  if (context.gitBranch) {
    parts.push(`Git branch: ${context.gitBranch}`);
  }
  parts.push(`User input: ${context.userInput}`);

  return parts.join("\n\n");
};

/**
 * Execute a skill
 */
export const executeSkill = async (
  skillId: string,
  context: SkillContext,
): Promise<SkillExecutionResult> => {
  try {
    const skill = await loadSkillForExecution(skillId);

    if (!skill) {
      return {
        success: false,
        skillId,
        prompt: "",
        error: SKILL_ERRORS.NOT_FOUND(skillId),
      };
    }

    const prompt = buildSkillPrompt(skill, context);

    return {
      success: true,
      skillId,
      prompt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      skillId,
      prompt: "",
      error: SKILL_ERRORS.EXECUTION_FAILED(skillId, message),
    };
  }
};

/**
 * Execute skill from user input (auto-detect and execute)
 */
export const executeFromInput = async (
  input: string,
  context: Omit<SkillContext, "userInput">,
): Promise<SkillExecutionResult | null> => {
  const match = await findBestMatch(input);

  if (!match) {
    return null;
  }

  return executeSkill(match.skill.id, {
    ...context,
    userInput: input,
  });
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get skills that can auto-trigger
 */
export const getAutoTriggerSkills = (): SkillDefinition[] => {
  return Array.from(registryState.skills.values()).filter(
    (skill) => skill.autoTrigger,
  );
};

/**
 * Get skills by tag
 */
export const getSkillsByTag = (tag: string): SkillDefinition[] => {
  return Array.from(registryState.skills.values()).filter((skill) =>
    skill.tags?.includes(tag),
  );
};

/**
 * Get available command completions
 */
export const getCommandCompletions = (partial: string): string[] => {
  const commands: string[] = [];

  for (const skill of registryState.skills.values()) {
    for (const trigger of skill.triggers) {
      if (trigger.startsWith(SKILL_MATCHING.COMMAND_PREFIX)) {
        if (trigger.toLowerCase().startsWith(partial.toLowerCase())) {
          commands.push(trigger);
        }
      }
    }
  }

  return commands.sort();
};
