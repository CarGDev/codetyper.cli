/**
 * Agent loader service
 * Loads agent configurations from markdown files
 */

import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import type {
  AgentConfig,
  AgentFrontmatter,
  AgentRegistry,
} from "@/types/agent-config";

const AGENT_PATTERNS = [
  ".codetyper/agent/**/*.agent.md",
  ".codetyper/agents/**/*.agent.md",
  ".coder/agent/**/*.agent.md",
  ".coder/agents/**/*.agent.md",
  "codetyper/agent/**/*.agent.md",
  "codetyper/agents/**/*.agent.md",
];

const DEFAULT_AGENT: AgentConfig = {
  id: "coder",
  name: "Coder",
  description: "General purpose coding assistant",
  prompt: "",
  filePath: "",
  mode: "primary",
};

let cachedRegistry: AgentRegistry | null = null;

const extractNameFromFile = (filePath: string): string => {
  const basename = path.basename(filePath, ".agent.md");
  return basename
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const extractIdFromFile = (filePath: string): string => {
  return path.basename(filePath, ".agent.md").toLowerCase();
};

/**
 * Simple frontmatter parser
 * Supports YAML frontmatter delimited by ---
 */
const parseFrontmatter = (
  content: string,
): { data: AgentFrontmatter; body: string } => {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { data: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];
  const data: AgentFrontmatter = {};

  // Simple YAML parsing for known fields
  const lines = yamlContent.split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    const keyMap: Record<string, keyof AgentFrontmatter> = {
      name: "name",
      description: "description",
      mode: "mode",
      model: "model",
      temperature: "temperature",
      topP: "topP",
      top_p: "topP",
      hidden: "hidden",
      color: "color",
    };

    const mappedKey = keyMap[key];
    if (mappedKey) {
      if (mappedKey === "temperature" || mappedKey === "topP") {
        data[mappedKey] = parseFloat(value);
      } else if (mappedKey === "hidden") {
        data[mappedKey] = value === "true";
      } else if (mappedKey === "mode") {
        data[mappedKey] = value as "primary" | "subagent" | "all";
      } else {
        (data as Record<string, unknown>)[mappedKey] = value;
      }
    }
  }

  return { data, body };
};

const parseAgentFile = async (
  filePath: string,
): Promise<AgentConfig | null> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const { data: frontmatter, body } = parseFrontmatter(content);

    const id = extractIdFromFile(filePath);
    const name = frontmatter.name ?? extractNameFromFile(filePath);

    // Extract description from frontmatter or first line starting with "ROLE:"
    let description = frontmatter.description ?? "";
    let prompt = body.trim();

    if (!description) {
      const roleMatch = body.match(/^ROLE:\s*(.+)$/m);
      if (roleMatch) {
        description = roleMatch[1].trim();
      }
    }

    // If no prompt in body, use entire content
    if (!prompt) {
      prompt = content;
    }

    return {
      id,
      name,
      description,
      prompt,
      filePath,
      mode: frontmatter.mode ?? "primary",
      model: frontmatter.model,
      temperature: frontmatter.temperature,
      topP: frontmatter.topP,
      hidden: frontmatter.hidden ?? false,
      color: frontmatter.color,
    };
  } catch {
    return null;
  }
};

export const loadAgents = async (
  workingDir: string,
): Promise<AgentRegistry> => {
  const agents = new Map<string, AgentConfig>();

  // Add default agent
  agents.set(DEFAULT_AGENT.id, DEFAULT_AGENT);

  // Find all agent files using fast-glob
  const files = await fg(AGENT_PATTERNS, {
    cwd: workingDir,
    absolute: true,
    onlyFiles: true,
  });

  // Parse each agent file
  for (const filePath of files) {
    const agent = await parseAgentFile(filePath);
    if (agent && !agent.hidden) {
      agents.set(agent.id, agent);
    }
  }

  cachedRegistry = {
    agents,
    defaultAgent: DEFAULT_AGENT.id,
  };

  return cachedRegistry;
};

export const getAgentRegistry = async (
  workingDir: string,
): Promise<AgentRegistry> => {
  if (cachedRegistry) {
    return cachedRegistry;
  }
  return loadAgents(workingDir);
};

export const getAgent = async (
  agentId: string,
  workingDir: string,
): Promise<AgentConfig | null> => {
  const registry = await getAgentRegistry(workingDir);
  return registry.agents.get(agentId) ?? null;
};

export const getAvailableAgents = async (
  workingDir: string,
): Promise<AgentConfig[]> => {
  const registry = await getAgentRegistry(workingDir);
  return Array.from(registry.agents.values())
    .filter((agent) => !agent.hidden && agent.mode !== "subagent")
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const clearAgentCache = (): void => {
  cachedRegistry = null;
};

export const agentLoader = {
  loadAgents,
  getAgentRegistry,
  getAgent,
  getAvailableAgents,
  clearAgentCache,
};
