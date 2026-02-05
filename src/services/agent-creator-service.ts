/**
 * Agent Creator Service
 *
 * Creates new agents and skills from user descriptions using LLM.
 * Stores them in .codetyper/agents/ and .codetyper/skills/.
 */

import { mkdir, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { chat } from "@providers/core/chat";
import {
  AGENT_CREATION_PROMPT,
  SKILL_CREATION_PROMPT,
  CODETYPER_DIRS,
} from "@constants/agent-templates";
import type { ProviderName } from "@/types/providers";

/**
 * Result of agent/skill creation
 */
export interface CreationResult {
  success: boolean;
  filePath?: string;
  name?: string;
  error?: string;
}

/**
 * Options for creating an agent
 */
export interface CreateAgentOptions {
  description: string;
  workingDir: string;
  provider?: ProviderName;
  model?: string;
}

/**
 * Options for creating a skill
 */
export interface CreateSkillOptions {
  description: string;
  workingDir: string;
  provider?: ProviderName;
  model?: string;
}

/**
 * Extract name from generated markdown
 */
const extractName = (markdown: string): string | null => {
  const match = markdown.match(/^name:\s*(.+)$/m);
  return match ? match[1].trim() : null;
};

/**
 * Clean markdown content (remove code fences if present)
 */
const cleanMarkdown = (content: string): string => {
  // Remove ```markdown and ``` wrappers if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```markdown")) {
    cleaned = cleaned.slice("```markdown".length);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
};

/**
 * Ensure directory exists
 */
const ensureDir = async (dirPath: string): Promise<void> => {
  await mkdir(dirPath, { recursive: true });
};

/**
 * Create a new agent from description using LLM
 */
export const createAgentFromDescription = async (
  options: CreateAgentOptions,
): Promise<CreationResult> => {
  const { description, workingDir, provider = "copilot", model } = options;

  try {
    // Generate agent using LLM
    const prompt = AGENT_CREATION_PROMPT.replace("{{description}}", description);

    const response = await chat(
      provider,
      [
        { role: "system", content: "You are an expert agent configuration generator." },
        { role: "user", content: prompt },
      ],
      { model, temperature: 0.7 },
    );

    if (!response.content) {
      return { success: false, error: "No response from LLM" };
    }

    // Clean and parse the generated markdown
    const markdown = cleanMarkdown(response.content);
    const name = extractName(markdown);

    if (!name) {
      return { success: false, error: "Could not extract agent name from generated content" };
    }

    // Validate name format
    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name) || name.length < 3 || name.length > 50) {
      return {
        success: false,
        error: `Invalid agent name: ${name}. Must be 3-50 chars, lowercase, hyphens only.`,
      };
    }

    // Create agents directory and write file
    const agentsDir = join(workingDir, CODETYPER_DIRS.agents);
    await ensureDir(agentsDir);

    const filePath = join(agentsDir, `${name}.md`);
    await writeFile(filePath, markdown, "utf-8");

    return {
      success: true,
      filePath,
      name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Create a new skill from description using LLM
 */
export const createSkillFromDescription = async (
  options: CreateSkillOptions,
): Promise<CreationResult> => {
  const { description, workingDir, provider = "copilot", model } = options;

  try {
    // Generate skill using LLM
    const prompt = SKILL_CREATION_PROMPT.replace("{{description}}", description);

    const response = await chat(
      provider,
      [
        { role: "system", content: "You are an expert skill documentation generator." },
        { role: "user", content: prompt },
      ],
      { model, temperature: 0.7 },
    );

    if (!response.content) {
      return { success: false, error: "No response from LLM" };
    }

    // Clean and parse the generated markdown
    const markdown = cleanMarkdown(response.content);
    const name = extractName(markdown);

    if (!name) {
      return { success: false, error: "Could not extract skill name from generated content" };
    }

    // Convert name to directory-safe format
    const dirName = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Create skills directory structure and write file
    const skillDir = join(workingDir, CODETYPER_DIRS.skills, dirName);
    await ensureDir(skillDir);

    const filePath = join(skillDir, "SKILL.md");
    await writeFile(filePath, markdown, "utf-8");

    return {
      success: true,
      filePath,
      name,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * List existing agents in .codetyper/agents/
 */
export const listCustomAgents = async (
  workingDir: string,
): Promise<string[]> => {
  const agentsDir = join(workingDir, CODETYPER_DIRS.agents);

  try {
    const files = await readdir(agentsDir);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
  } catch {
    return [];
  }
};

/**
 * List existing skills in .codetyper/skills/
 */
export const listCustomSkills = async (
  workingDir: string,
): Promise<string[]> => {
  const skillsDir = join(workingDir, CODETYPER_DIRS.skills);

  try {
    const dirs = await readdir(skillsDir, { withFileTypes: true });
    return dirs.filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
};

/**
 * Get suggested agent types based on description
 */
export const suggestAgentType = (description: string): string => {
  const lower = description.toLowerCase();

  const patterns: Record<string, string[]> = {
    explore: ["search", "find", "explore", "understand", "analyze codebase"],
    review: ["review", "check", "audit", "inspect", "quality"],
    implement: ["implement", "create", "build", "write code", "develop"],
    test: ["test", "testing", "unit test", "coverage"],
    refactor: ["refactor", "improve", "clean up", "optimize"],
    security: ["security", "vulnerability", "secure", "audit"],
    documentation: ["document", "docs", "readme", "api docs"],
    plan: ["plan", "design", "architect", "strategy"],
  };

  for (const [type, keywords] of Object.entries(patterns)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return type;
    }
  }

  return "general";
};
