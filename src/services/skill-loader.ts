/**
 * Skill Loader Service
 *
 * Parses SKILL.md files with frontmatter and body content.
 * Supports progressive disclosure with 3 loading levels.
 */

import fs from "fs/promises";
import { join } from "path";
import {
  SKILL_FILE,
  SKILL_DIRS,
  SKILL_DEFAULTS,
  SKILL_ERRORS,
  SKILL_REQUIRED_FIELDS,
  SKILL_LOADING,
} from "@constants/skills";
import type {
  SkillDefinition,
  SkillMetadata,
  SkillFrontmatter,
  ParsedSkillFile,
  SkillExample,
  SkillLoadLevel,
} from "@/types/skills";

// ============================================================================
// Frontmatter Parsing
// ============================================================================

/**
 * Parse YAML-like frontmatter from SKILL.md content
 */
const parseFrontmatter = (
  content: string,
): { frontmatter: string; body: string } => {
  const delimiter = SKILL_FILE.FRONTMATTER_DELIMITER;
  const lines = content.split("\n");

  if (lines[0]?.trim() !== delimiter) {
    return { frontmatter: "", body: content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === delimiter) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: "", body: content };
  }

  const frontmatter = lines.slice(1, endIndex).join("\n");
  const body = lines
    .slice(endIndex + 1)
    .join("\n")
    .trim();

  return { frontmatter, body };
};

/**
 * Parse simple YAML-like frontmatter to object
 * Supports: strings, arrays (- item), booleans
 */
const parseYamlLike = (yaml: string): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Array item
    if (trimmed.startsWith("- ") && currentKey) {
      const value = trimmed.slice(2).trim();
      if (!currentArray) {
        currentArray = [];
      }
      // Remove quotes if present
      const unquoted = value.replace(/^["']|["']$/g, "");
      currentArray.push(unquoted);
      result[currentKey] = currentArray;
      continue;
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      // Save previous array if exists
      if (currentArray && currentKey) {
        result[currentKey] = currentArray;
      }
      currentArray = null;

      currentKey = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (!value) {
        // Empty value, might be followed by array
        continue;
      }

      // Parse value type
      const parsed = parseValue(value);
      result[currentKey] = parsed;
    }
  }

  return result;
};

/**
 * Parse a single YAML value
 */
const parseValue = (value: string): string | boolean | number => {
  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value !== "") return num;

  // String (remove quotes if present)
  return value.replace(/^["']|["']$/g, "");
};

/**
 * Validate required fields in frontmatter
 */
const validateFrontmatter = (
  data: Record<string, unknown>,
  filePath: string,
): SkillFrontmatter => {
  for (const field of SKILL_REQUIRED_FIELDS) {
    if (!(field in data) || data[field] === undefined || data[field] === "") {
      throw new Error(SKILL_ERRORS.MISSING_REQUIRED_FIELD(field, filePath));
    }
  }

  // Validate triggers is an array
  if (!Array.isArray(data.triggers)) {
    throw new Error(
      SKILL_ERRORS.MISSING_REQUIRED_FIELD("triggers (array)", filePath),
    );
  }

  return {
    id: String(data.id),
    name: String(data.name),
    description: String(data.description),
    version: data.version ? String(data.version) : undefined,
    triggers: data.triggers as string[],
    triggerType: data.triggerType as SkillFrontmatter["triggerType"],
    autoTrigger:
      typeof data.autoTrigger === "boolean" ? data.autoTrigger : undefined,
    requiredTools: Array.isArray(data.requiredTools)
      ? (data.requiredTools as string[])
      : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
  };
};

// ============================================================================
// Example Parsing
// ============================================================================

/**
 * Parse examples from skill body
 * Examples are in format:
 * ## Examples
 * ### Example 1
 * Input: ...
 * Output: ...
 */
const parseExamples = (body: string): SkillExample[] => {
  const examples: SkillExample[] = [];
  const exampleSection = body.match(/## Examples([\s\S]*?)(?=##[^#]|$)/i);

  if (!exampleSection) return examples;

  const content = exampleSection[1];
  const exampleBlocks = content.split(/### /);

  for (const block of exampleBlocks) {
    if (!block.trim()) continue;

    const inputMatch = block.match(/Input:\s*([\s\S]*?)(?=Output:|$)/i);
    const outputMatch = block.match(/Output:\s*([\s\S]*?)(?=###|$)/i);

    if (inputMatch && outputMatch) {
      const descMatch = block.match(/^([^\n]+)/);
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : undefined,
      });
    }
  }

  return examples;
};

// ============================================================================
// File Loading
// ============================================================================

/**
 * Load and parse a SKILL.md file
 */
export const loadSkillFile = async (
  filePath: string,
): Promise<ParsedSkillFile> => {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > SKILL_LOADING.MAX_FILE_SIZE_BYTES) {
      throw new Error(`Skill file too large: ${filePath}`);
    }

    const content = await fs.readFile(filePath, SKILL_FILE.ENCODING);
    const { frontmatter, body } = parseFrontmatter(content);

    if (!frontmatter) {
      throw new Error(SKILL_ERRORS.INVALID_FRONTMATTER(filePath));
    }

    const data = parseYamlLike(frontmatter);
    const validatedFrontmatter = validateFrontmatter(data, filePath);
    const examples = parseExamples(body);

    return {
      frontmatter: validatedFrontmatter,
      body,
      examples: examples.length > 0 ? examples : undefined,
      filePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(SKILL_ERRORS.LOAD_FAILED(filePath, message));
  }
};

/**
 * Convert parsed skill file to SkillMetadata (Level 1)
 */
export const toSkillMetadata = (parsed: ParsedSkillFile): SkillMetadata => ({
  id: parsed.frontmatter.id,
  name: parsed.frontmatter.name,
  description: parsed.frontmatter.description,
  version: parsed.frontmatter.version ?? SKILL_DEFAULTS.VERSION,
  triggers: parsed.frontmatter.triggers,
  triggerType: parsed.frontmatter.triggerType ?? SKILL_DEFAULTS.TRIGGER_TYPE,
  autoTrigger: parsed.frontmatter.autoTrigger ?? SKILL_DEFAULTS.AUTO_TRIGGER,
  requiredTools:
    parsed.frontmatter.requiredTools ?? SKILL_DEFAULTS.REQUIRED_TOOLS,
  tags: parsed.frontmatter.tags,
});

/**
 * Convert parsed skill file to full SkillDefinition (Level 3)
 */
export const toSkillDefinition = (parsed: ParsedSkillFile): SkillDefinition => {
  const metadata = toSkillMetadata(parsed);

  // Extract system prompt and instructions from body
  const { systemPrompt, instructions } = parseSkillBody(parsed.body);

  return {
    ...metadata,
    systemPrompt,
    instructions,
    examples: parsed.examples,
    loadedAt: Date.now(),
  };
};

/**
 * Parse skill body to extract system prompt and instructions
 */
const parseSkillBody = (
  body: string,
): { systemPrompt: string; instructions: string } => {
  // Look for ## System Prompt section
  const systemPromptMatch = body.match(
    /## System Prompt([\s\S]*?)(?=## Instructions|## Examples|$)/i,
  );

  // Look for ## Instructions section
  const instructionsMatch = body.match(
    /## Instructions([\s\S]*?)(?=## Examples|## System Prompt|$)/i,
  );

  // If no sections found, use the whole body as instructions
  const systemPrompt = systemPromptMatch ? systemPromptMatch[1].trim() : "";
  const instructions = instructionsMatch
    ? instructionsMatch[1].trim()
    : body.trim();

  return { systemPrompt, instructions };
};

// ============================================================================
// Directory Scanning
// ============================================================================

/**
 * Find all SKILL.md files in a directory
 */
export const findSkillFiles = async (dir: string): Promise<string[]> => {
  const skillFiles: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check for SKILL.md in subdirectory
        const skillPath = join(fullPath, SKILL_FILE.NAME);
        try {
          await fs.access(skillPath);
          skillFiles.push(skillPath);
        } catch {
          // No SKILL.md in this directory
        }
      } else if (entry.name === SKILL_FILE.NAME) {
        skillFiles.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or isn't accessible
  }

  return skillFiles;
};

/**
 * Load all skills from a directory
 */
export const loadSkillsFromDirectory = async (
  dir: string,
  level: SkillLoadLevel = "metadata",
): Promise<SkillDefinition[]> => {
  const skillFiles = await findSkillFiles(dir);
  const skills: SkillDefinition[] = [];

  for (const filePath of skillFiles) {
    try {
      const parsed = await loadSkillFile(filePath);

      if (level === "metadata") {
        // Only load metadata, but cast to SkillDefinition for uniform handling
        const metadata = toSkillMetadata(parsed);
        skills.push({
          ...metadata,
          systemPrompt: "",
          instructions: "",
        });
      } else {
        skills.push(toSkillDefinition(parsed));
      }
    } catch (error) {
      // Log error but continue loading other skills
      console.error(
        `Failed to load skill: ${filePath}`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return skills;
};

/**
 * Load all skills from all skill directories
 */
export const loadAllSkills = async (
  level: SkillLoadLevel = "metadata",
): Promise<SkillDefinition[]> => {
  const allSkills: SkillDefinition[] = [];
  const dirs = [SKILL_DIRS.BUILTIN, SKILL_DIRS.USER];

  // Add project skills if we're in a project directory
  const projectSkillsDir = join(process.cwd(), SKILL_DIRS.PROJECT);

  try {
    await fs.access(projectSkillsDir);
    dirs.push(projectSkillsDir);
  } catch {
    // No project skills directory
  }

  for (const dir of dirs) {
    const skills = await loadSkillsFromDirectory(dir, level);
    allSkills.push(...skills);
  }

  // Deduplicate by ID (later ones override earlier)
  const skillMap = new Map<string, SkillDefinition>();
  for (const skill of allSkills) {
    skillMap.set(skill.id, skill);
  }

  return Array.from(skillMap.values());
};

/**
 * Load a specific skill by ID
 */
export const loadSkillById = async (
  id: string,
  level: SkillLoadLevel = "full",
): Promise<SkillDefinition | null> => {
  const dirs = [SKILL_DIRS.BUILTIN, SKILL_DIRS.USER];
  const projectSkillsDir = join(process.cwd(), SKILL_DIRS.PROJECT);

  try {
    await fs.access(projectSkillsDir);
    dirs.push(projectSkillsDir);
  } catch {
    // No project skills directory
  }

  // Search in reverse order (project > user > builtin)
  for (const dir of dirs.reverse()) {
    const skillPath = join(dir, id, SKILL_FILE.NAME);

    try {
      await fs.access(skillPath);
      const parsed = await loadSkillFile(skillPath);

      if (parsed.frontmatter.id === id) {
        return level === "metadata"
          ? { ...toSkillMetadata(parsed), systemPrompt: "", instructions: "" }
          : toSkillDefinition(parsed);
      }
    } catch {
      // Skill not found in this directory
    }
  }

  return null;
};
