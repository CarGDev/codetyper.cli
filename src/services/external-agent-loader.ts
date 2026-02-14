/**
 * External Agent Loader
 *
 * Loads agent definitions from .claude/, .github/, .codetyper/
 * directories in the project root. These agents are parsed from
 * their respective frontmatter+markdown format and converted to
 * SkillDefinition for unified handling.
 */

import fs from "fs/promises";
import { join, basename, extname } from "path";
import {
  EXTERNAL_AGENT_DIRS,
  EXTERNAL_AGENT_FILES,
  SKILL_DEFAULTS,
} from "@constants/skills";
import type {
  SkillDefinition,
  SkillSource,
  ExternalAgentFile,
  ParsedExternalAgent,
} from "@/types/skills";

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Check if a file is a recognized agent definition
 */
const isAgentFile = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  const ext = extname(lower);

  // Check known filenames
  if (EXTERNAL_AGENT_FILES.KNOWN_FILES.some((f) => lower === f.toLowerCase())) {
    return true;
  }

  // Check extensions for files in agent subdirectories
  return (EXTERNAL_AGENT_FILES.EXTENSIONS as readonly string[]).includes(ext);
};

/**
 * Scan a directory for agent files (non-recursive for top level)
 */
const scanDirectory = async (
  dir: string,
  source: SkillSource,
): Promise<ExternalAgentFile[]> => {
  const files: ExternalAgentFile[] = [];

  try {
    await fs.access(dir);
  } catch {
    return files; // Directory doesn't exist
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isFile() && isAgentFile(entry.name)) {
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          files.push({
            relativePath: entry.name,
            absolutePath: fullPath,
            source,
            content,
          });
        } catch {
          // Skip unreadable files
        }
      } else if (
        entry.isDirectory() &&
        (EXTERNAL_AGENT_FILES.SUBDIRS as readonly string[]).includes(entry.name.toLowerCase())
      ) {
        // Scan recognized subdirectories
        const subFiles = await scanSubdirectory(fullPath, source);
        files.push(...subFiles);
      }
    }
  } catch {
    // Directory not accessible
  }

  return files;
};

/**
 * Scan a subdirectory for agent files
 */
const scanSubdirectory = async (
  dir: string,
  source: SkillSource,
): Promise<ExternalAgentFile[]> => {
  const files: ExternalAgentFile[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const ext = extname(entry.name).toLowerCase();
      if (!(EXTERNAL_AGENT_FILES.EXTENSIONS as readonly string[]).includes(ext)) continue;

      const fullPath = join(dir, entry.name);

      try {
        const content = await fs.readFile(fullPath, "utf-8");
        files.push({
          relativePath: join(basename(dir), entry.name),
          absolutePath: fullPath,
          source,
          content,
        });
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Subdirectory not accessible
  }

  return files;
};

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse the frontmatter from an external agent file.
 * Supports the standard --- delimited YAML-like frontmatter.
 */
const parseFrontmatter = (
  content: string,
): { frontmatter: Record<string, unknown>; body: string } => {
  const lines = content.split("\n");

  if (lines[0]?.trim() !== "---") {
    // No frontmatter — the entire content is the body
    return { frontmatter: {}, body: content.trim() };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, body: content.trim() };
  }

  const fmLines = lines.slice(1, endIndex);
  const body = lines
    .slice(endIndex + 1)
    .join("\n")
    .trim();

  // Simple YAML-like parsing
  const fm: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Array item
    if (trimmed.startsWith("- ") && currentKey) {
      if (!currentArray) currentArray = [];
      const value = trimmed.slice(2).trim().replace(/^["']|["']$/g, "");
      currentArray.push(value);
      fm[currentKey] = currentArray;
      continue;
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      if (currentArray && currentKey) {
        fm[currentKey] = currentArray;
      }
      currentArray = null;

      currentKey = trimmed.slice(0, colonIdx).trim();
      const rawValue = trimmed.slice(colonIdx + 1).trim();

      if (!rawValue) continue; // Empty → might be array header

      // Inline array: [a, b, c]
      if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
        const items = rawValue
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
        fm[currentKey] = items;
      } else {
        fm[currentKey] = rawValue.replace(/^["']|["']$/g, "");
      }
    }
  }

  return { frontmatter: fm, body };
};

/**
 * Parse an external agent file into a structured definition
 */
const parseAgentFile = (file: ExternalAgentFile): ParsedExternalAgent => {
  const { frontmatter, body } = parseFrontmatter(file.content);

  // Derive ID from filename (strip extension, lowercase, kebab-case)
  const nameWithoutExt = basename(file.relativePath, extname(file.relativePath));
  const id = `ext-${file.source.replace("external-", "")}-${nameWithoutExt
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  const description =
    typeof frontmatter.description === "string"
      ? frontmatter.description
      : `External agent from ${file.source}: ${nameWithoutExt}`;

  const tools = Array.isArray(frontmatter.tools)
    ? (frontmatter.tools as string[])
    : [];

  return {
    id,
    description,
    tools,
    body,
    source: file.source,
    filePath: file.absolutePath,
  };
};

// ============================================================================
// Conversion
// ============================================================================

/**
 * Convert a parsed external agent to a SkillDefinition
 * so it can be used uniformly in the skill registry.
 */
const toSkillDefinition = (agent: ParsedExternalAgent): SkillDefinition => {
  // Derive a human-readable name from the ID
  const name = agent.id
    .replace(/^ext-[a-z]+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Extract triggers from the agent body (look for trigger patterns)
  const triggers: string[] = [`/${agent.id}`];

  return {
    id: agent.id,
    name,
    description: agent.description,
    version: SKILL_DEFAULTS.VERSION,
    triggers,
    triggerType: "explicit",
    autoTrigger: false,
    requiredTools: agent.tools,
    tags: [agent.source, "external"],
    source: agent.source,
    systemPrompt: "",
    instructions: agent.body,
    loadedAt: Date.now(),
  };
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Source-to-directory mapping
 */
const SOURCE_DIRS: ReadonlyArray<readonly [string, SkillSource]> = [
  [EXTERNAL_AGENT_DIRS.CLAUDE, "external-claude"],
  [EXTERNAL_AGENT_DIRS.GITHUB, "external-github"],
  [EXTERNAL_AGENT_DIRS.CODETYPER, "external-codetyper"],
];

/**
 * Load all external agents from recognized directories
 * in the current project.
 */
export const loadExternalAgents = async (
  projectRoot?: string,
): Promise<SkillDefinition[]> => {
  const root = projectRoot ?? process.cwd();
  const allAgents: SkillDefinition[] = [];

  for (const [dirName, source] of SOURCE_DIRS) {
    const dir = join(root, dirName);
    const files = await scanDirectory(dir, source);

    for (const file of files) {
      try {
        const parsed = parseAgentFile(file);
        const skill = toSkillDefinition(parsed);
        allAgents.push(skill);
      } catch {
        // Skip unparseable files
      }
    }
  }

  return allAgents;
};

/**
 * Load a specific external agent by source and filename
 */
export const loadExternalAgentByPath = async (
  filePath: string,
  source: SkillSource,
): Promise<SkillDefinition | null> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const file: ExternalAgentFile = {
      relativePath: basename(filePath),
      absolutePath: filePath,
      source,
      content,
    };
    const parsed = parseAgentFile(file);
    return toSkillDefinition(parsed);
  } catch {
    return null;
  }
};

/**
 * Check if any external agent directories exist
 */
export const hasExternalAgents = async (
  projectRoot?: string,
): Promise<boolean> => {
  const root = projectRoot ?? process.cwd();

  for (const [dirName] of SOURCE_DIRS) {
    try {
      await fs.access(join(root, dirName));
      return true;
    } catch {
      continue;
    }
  }

  return false;
};
