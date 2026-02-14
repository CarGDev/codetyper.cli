/**
 * Skill Auto-Detector
 *
 * Analyzes user prompts to automatically detect and activate
 * relevant skills based on keywords, file extensions, and context.
 * Skills are selected AFTER plans are approved and before agent execution.
 */

import {
  SKILL_DETECTION_KEYWORDS,
  SKILL_AUTO_DETECT_THRESHOLD,
  SKILL_AUTO_DETECT_MAX,
} from "@constants/skills";
import type { SkillDefinition, AutoDetectedSkill } from "@/types/skills";

// ============================================================================
// Keyword Matching
// ============================================================================

/**
 * Score a prompt against the keyword detection table.
 * Returns a map of skillId → { totalScore, matchedKeywords, category }.
 */
const scorePromptKeywords = (
  prompt: string,
): Map<
  string,
  { totalScore: number; matchedKeywords: string[]; category: string }
> => {
  const lower = prompt.toLowerCase();
  const scores = new Map<
    string,
    { totalScore: number; matchedKeywords: string[]; category: string }
  >();

  for (const [keyword, skillId, category, weight] of SKILL_DETECTION_KEYWORDS) {
    const keyLower = keyword.toLowerCase();

    // Check for whole-word or phrase match
    const hasMatch = matchKeyword(lower, keyLower);
    if (!hasMatch) continue;

    const existing = scores.get(skillId);
    if (existing) {
      existing.totalScore = Math.min(1, existing.totalScore + weight * 0.3);
      existing.matchedKeywords.push(keyword);
    } else {
      scores.set(skillId, {
        totalScore: weight,
        matchedKeywords: [keyword],
        category,
      });
    }
  }

  return scores;
};

/**
 * Check if a keyword appears in text (word-boundary aware)
 */
const matchKeyword = (text: string, keyword: string): boolean => {
  // For short keywords (1-3 chars), require word boundaries
  if (keyword.length <= 3) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
    return regex.test(text);
  }

  // For file extensions, match exactly
  if (keyword.startsWith(".")) {
    return text.includes(keyword);
  }

  // For longer keywords/phrases, simple includes is fine
  return text.includes(keyword);
};

/**
 * Escape special regex characters
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ============================================================================
// Context Analysis
// ============================================================================

/**
 * Analyze file references in the prompt for additional skill signals
 */
const analyzeFileReferences = (
  prompt: string,
): Map<string, number> => {
  const signals = new Map<string, number>();

  // TypeScript/JavaScript files
  if (/\.(ts|tsx)\b/.test(prompt)) {
    signals.set("typescript", (signals.get("typescript") ?? 0) + 0.3);
  }
  if (/\.(jsx)\b/.test(prompt)) {
    signals.set("react", (signals.get("react") ?? 0) + 0.4);
  }

  // Style files
  if (/\.(css|scss|sass|less)\b/.test(prompt)) {
    signals.set("css-scss", (signals.get("css-scss") ?? 0) + 0.4);
  }

  // Config files
  if (/docker(file|-compose)|\.dockerfile/i.test(prompt)) {
    signals.set("devops", (signals.get("devops") ?? 0) + 0.5);
  }
  if (/\.github\/workflows/i.test(prompt)) {
    signals.set("devops", (signals.get("devops") ?? 0) + 0.5);
  }

  // Test files
  if (/\.(test|spec)\.(ts|tsx|js|jsx)\b/.test(prompt)) {
    signals.set("testing", (signals.get("testing") ?? 0) + 0.5);
  }

  // Database-related files
  if (/\.(sql|prisma)\b/.test(prompt) || /migration/i.test(prompt)) {
    signals.set("database", (signals.get("database") ?? 0) + 0.4);
  }

  return signals;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Detect which skills should be activated for a given user prompt.
 * Returns up to SKILL_AUTO_DETECT_MAX skills sorted by confidence.
 *
 * @param prompt - The user's message
 * @param availableSkills - All registered skills to match against
 * @returns Detected skills with confidence scores
 */
export const detectSkillsForPrompt = (
  prompt: string,
  availableSkills: SkillDefinition[],
): AutoDetectedSkill[] => {
  // Step 1: Score keywords
  const keywordScores = scorePromptKeywords(prompt);

  // Step 2: Analyze file references for bonus signals
  const fileSignals = analyzeFileReferences(prompt);

  // Step 3: Merge file signals into keyword scores
  for (const [skillId, bonus] of fileSignals) {
    const existing = keywordScores.get(skillId);
    if (existing) {
      existing.totalScore = Math.min(1, existing.totalScore + bonus);
    } else {
      keywordScores.set(skillId, {
        totalScore: bonus,
        matchedKeywords: [`(file pattern)`],
        category: "file",
      });
    }
  }

  // Step 4: Match against available skills and filter by threshold
  const detected: AutoDetectedSkill[] = [];

  for (const [skillId, score] of keywordScores) {
    if (score.totalScore < SKILL_AUTO_DETECT_THRESHOLD) continue;

    // Find the matching skill definition
    const skill = availableSkills.find(
      (s) => s.id === skillId && s.autoTrigger !== false,
    );
    if (!skill) continue;

    detected.push({
      skill,
      confidence: Math.min(1, score.totalScore),
      matchedKeywords: score.matchedKeywords,
      category: score.category,
    });
  }

  // Step 5: Sort by confidence and limit
  detected.sort((a, b) => b.confidence - a.confidence);
  return detected.slice(0, SKILL_AUTO_DETECT_MAX);
};

/**
 * Build a skill injection prompt from detected skills.
 * This is appended to the system prompt to give the agent
 * specialized knowledge for the current task.
 */
export const buildSkillInjection = (
  detectedSkills: AutoDetectedSkill[],
): string => {
  if (detectedSkills.length === 0) return "";

  const parts: string[] = [
    "# Activated Skills",
    "",
    "The following specialized skills have been activated for this task. " +
      "Use their guidelines and best practices when applicable:",
    "",
  ];

  for (const { skill, confidence, matchedKeywords } of detectedSkills) {
    parts.push(`## Skill: ${skill.name} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    parts.push(`Matched: ${matchedKeywords.join(", ")}`);
    parts.push("");

    if (skill.systemPrompt) {
      parts.push(skill.systemPrompt);
      parts.push("");
    }

    if (skill.instructions) {
      parts.push(skill.instructions);
      parts.push("");
    }

    parts.push("---");
    parts.push("");
  }

  return parts.join("\n");
};

/**
 * Format detected skills for logging/display
 */
export const formatDetectedSkills = (
  detectedSkills: AutoDetectedSkill[],
): string => {
  if (detectedSkills.length === 0) return "No skills auto-detected.";

  const names = detectedSkills.map(
    (d) => `${d.skill.name} (${(d.confidence * 100).toFixed(0)}%)`,
  );
  return `Skills activated: ${names.join(", ")}`;
};
