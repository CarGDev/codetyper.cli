/**
 * Agent definition loader service
 * Loads agent definitions from markdown files with YAML frontmatter
 */

import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

import type {
  AgentDefinition,
  AgentFrontmatter,
  AgentRegistry,
  AgentLoadResult,
  AgentTier,
  AgentColor,
} from "@/types/agent-definition";
import {
  DEFAULT_AGENT_DEFINITION,
  AGENT_DEFINITION_SCHEMA,
} from "@/types/agent-definition";
import {
  AGENT_DEFINITION,
  AGENT_DEFINITION_PATHS,
  AGENT_MESSAGES,
} from "@constants/agent-definition";

const parseFrontmatter = (
  content: string,
): { frontmatter: Record<string, unknown>; body: string } | null => {
  const delimiter = AGENT_DEFINITION.FRONTMATTER_DELIMITER;
  const lines = content.split("\n");

  if (lines[0]?.trim() !== delimiter) {
    return null;
  }

  const endIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === delimiter,
  );
  if (endIndex === -1) {
    return null;
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines
    .slice(endIndex + 1)
    .join("\n")
    .trim();

  // Simple YAML parser for frontmatter
  const frontmatter: Record<string, unknown> = {};
  let currentKey = "";
  let currentArray: string[] | null = null;

  frontmatterLines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") && currentArray !== null) {
      currentArray.push(trimmed.slice(2));
      return;
    }

    if (currentArray !== null) {
      frontmatter[currentKey] = currentArray;
      currentArray = null;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) return;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (value === "") {
      currentKey = key;
      currentArray = [];
    } else if (value.startsWith("[") && value.endsWith("]")) {
      frontmatter[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else if (value === "true") {
      frontmatter[key] = true;
    } else if (value === "false") {
      frontmatter[key] = false;
    } else if (!isNaN(Number(value))) {
      frontmatter[key] = Number(value);
    } else {
      frontmatter[key] = value.replace(/^["']|["']$/g, "");
    }
  });

  if (currentArray !== null) {
    frontmatter[currentKey] = currentArray;
  }

  return { frontmatter, body };
};

const validateFrontmatter = (
  frontmatter: Record<string, unknown>,
): AgentFrontmatter | null => {
  const { required } = AGENT_DEFINITION_SCHEMA;

  for (const field of required) {
    if (!(field in frontmatter)) {
      return null;
    }
  }

  const name = frontmatter.name;
  const description = frontmatter.description;
  const tools = frontmatter.tools;

  if (
    typeof name !== "string" ||
    typeof description !== "string" ||
    !Array.isArray(tools)
  ) {
    return null;
  }

  return {
    name,
    description,
    tools: tools as ReadonlyArray<string>,
    tier: (frontmatter.tier as AgentTier) || DEFAULT_AGENT_DEFINITION.tier,
    color: (frontmatter.color as AgentColor) || DEFAULT_AGENT_DEFINITION.color,
    maxTurns:
      (frontmatter.maxTurns as number) || DEFAULT_AGENT_DEFINITION.maxTurns,
    triggerPhrases: (frontmatter.triggerPhrases as ReadonlyArray<string>) || [],
    capabilities: (frontmatter.capabilities as ReadonlyArray<string>) || [],
    allowedPaths: frontmatter.allowedPaths as ReadonlyArray<string> | undefined,
    deniedPaths: frontmatter.deniedPaths as ReadonlyArray<string> | undefined,
  };
};

const frontmatterToDefinition = (
  frontmatter: AgentFrontmatter,
  content: string,
): AgentDefinition => ({
  name: frontmatter.name,
  description: frontmatter.description,
  tools: frontmatter.tools,
  tier: frontmatter.tier || (DEFAULT_AGENT_DEFINITION.tier as AgentTier),
  color: frontmatter.color || (DEFAULT_AGENT_DEFINITION.color as AgentColor),
  maxTurns: frontmatter.maxTurns || DEFAULT_AGENT_DEFINITION.maxTurns,
  systemPrompt: content || undefined,
  triggerPhrases: frontmatter.triggerPhrases || [],
  capabilities: frontmatter.capabilities || [],
  permissions: {
    allowedPaths: frontmatter.allowedPaths,
    deniedPaths: frontmatter.deniedPaths,
  },
});

export const loadAgentDefinitionFile = async (
  filePath: string,
): Promise<AgentLoadResult> => {
  try {
    const content = await readFile(filePath, "utf-8");
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      return {
        success: false,
        error: AGENT_MESSAGES.INVALID_FRONTMATTER,
        filePath,
      };
    }

    const frontmatter = validateFrontmatter(parsed.frontmatter);

    if (!frontmatter) {
      return {
        success: false,
        error: AGENT_MESSAGES.MISSING_REQUIRED,
        filePath,
      };
    }

    const agent = frontmatterToDefinition(frontmatter, parsed.body);

    return { success: true, agent, filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message, filePath };
  }
};

export const loadAgentDefinitionsFromDirectory = async (
  directoryPath: string,
): Promise<ReadonlyArray<AgentLoadResult>> => {
  const resolvedPath = directoryPath.replace("~", homedir());

  if (!existsSync(resolvedPath)) {
    return [];
  }

  try {
    const files = await readdir(resolvedPath);
    const mdFiles = files.filter(
      (file) => extname(file) === AGENT_DEFINITION.FILE_EXTENSION,
    );

    const results = await Promise.all(
      mdFiles.map((file) => loadAgentDefinitionFile(join(resolvedPath, file))),
    );

    return results;
  } catch {
    return [];
  }
};

export const loadAllAgentDefinitions = async (
  projectPath: string,
): Promise<AgentRegistry> => {
  const agents = new Map<string, AgentDefinition>();
  const byTrigger = new Map<string, string>();
  const byCapability = new Map<string, string[]>();

  // Load from all paths in priority order (project > global > builtin)
  const paths = [
    join(projectPath, AGENT_DEFINITION_PATHS.PROJECT),
    AGENT_DEFINITION_PATHS.GLOBAL,
  ];

  for (const path of paths) {
    const results = await loadAgentDefinitionsFromDirectory(path);

    results.forEach((result) => {
      if (result.success && result.agent) {
        const { agent } = result;

        // Don't override if already loaded (project takes precedence)
        if (!agents.has(agent.name)) {
          agents.set(agent.name, agent);

          // Index by trigger phrases
          agent.triggerPhrases?.forEach((phrase: string) => {
            byTrigger.set(phrase.toLowerCase(), agent.name);
          });

          // Index by capabilities
          agent.capabilities?.forEach((capability: string) => {
            const existing = byCapability.get(capability) || [];
            byCapability.set(capability, [...existing, agent.name]);
          });
        }
      }
    });
  }

  return { agents, byTrigger, byCapability };
};

export const findAgentByTrigger = (
  registry: AgentRegistry,
  text: string,
): AgentDefinition | undefined => {
  const normalized = text.toLowerCase();

  for (const [phrase, agentName] of registry.byTrigger) {
    if (normalized.includes(phrase)) {
      return registry.agents.get(agentName);
    }
  }

  return undefined;
};

export const findAgentsByCapability = (
  registry: AgentRegistry,
  capability: string,
): ReadonlyArray<AgentDefinition> => {
  const agentNames = registry.byCapability.get(capability) || [];
  return agentNames
    .map((name: string) => registry.agents.get(name))
    .filter(
      (a: AgentDefinition | undefined): a is AgentDefinition => a !== undefined,
    );
};

export const getAgentByName = (
  registry: AgentRegistry,
  name: string,
): AgentDefinition | undefined => registry.agents.get(name);

export const listAllAgents = (
  registry: AgentRegistry,
): ReadonlyArray<AgentDefinition> => Array.from(registry.agents.values());

export const createAgentDefinitionContent = (
  agent: AgentDefinition,
): string => {
  const frontmatter = [
    "---",
    `name: ${agent.name}`,
    `description: ${agent.description}`,
    `tools: [${agent.tools.join(", ")}]`,
    `tier: ${agent.tier}`,
    `color: ${agent.color}`,
  ];

  if (agent.maxTurns) {
    frontmatter.push(`maxTurns: ${agent.maxTurns}`);
  }

  if (agent.triggerPhrases && agent.triggerPhrases.length > 0) {
    frontmatter.push("triggerPhrases:");
    agent.triggerPhrases.forEach((phrase: string) =>
      frontmatter.push(`  - ${phrase}`),
    );
  }

  if (agent.capabilities && agent.capabilities.length > 0) {
    frontmatter.push("capabilities:");
    agent.capabilities.forEach((cap: string) => frontmatter.push(`  - ${cap}`));
  }

  frontmatter.push("---");

  const content =
    agent.systemPrompt || `# ${agent.name}\n\n${agent.description}`;

  return `${frontmatter.join("\n")}\n\n${content}`;
};
