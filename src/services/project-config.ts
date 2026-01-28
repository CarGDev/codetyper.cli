/**
 * Project configuration management
 *
 * Supports both local (.codetyper/) and global (~/.codetyper/) configurations
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import type {
  AgentConfig,
  SkillConfig,
  RuleConfig,
  LearningEntry,
  ProjectSettings,
} from "@/types/project-config";

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".codetyper");
const LOCAL_CONFIG_DIR = ".codetyper";

/**
 * State
 */
let workingDir = process.cwd();
let initialized = false;

/**
 * Get local config directory
 */
export const getLocalConfigDir = (): string =>
  path.join(workingDir, LOCAL_CONFIG_DIR);

/**
 * Get global config directory
 */
export const getGlobalConfigDir = (): string => GLOBAL_CONFIG_DIR;

/**
 * Helper: Load JSON file
 */
const loadJsonFile = async <T>(
  filePath: string,
  defaultValue: T,
): Promise<T> => {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

/**
 * Helper: List files with extension
 */
const listFiles = async (dir: string, extension: string): Promise<string[]> => {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith(extension));
  } catch {
    return [];
  }
};

/**
 * Helper: Load rules from directory
 */
const loadRulesFromDir = async (dir: string): Promise<RuleConfig[]> => {
  const rules: RuleConfig[] = [];
  const files = await listFiles(dir, ".md");

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(dir, file), "utf-8");
      const name = path.basename(file, ".md");
      rules.push({ name, content });
    } catch {
      // Skip on error
    }
  }

  return rules;
};

/**
 * Helper: Load JSON configs from directory
 */
const loadJsonConfigs = async <T>(dir: string): Promise<T[]> => {
  const configs: T[] = [];
  const files = await listFiles(dir, ".json");

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(dir, file), "utf-8");
      configs.push(JSON.parse(content));
    } catch {
      // Skip on error
    }
  }

  return configs;
};

/**
 * Ensure global config exists
 */
const ensureGlobalConfig = async (): Promise<void> => {
  const dirs = [
    getGlobalConfigDir(),
    path.join(getGlobalConfigDir(), "rules"),
    path.join(getGlobalConfigDir(), "agents"),
    path.join(getGlobalConfigDir(), "skills"),
    path.join(getGlobalConfigDir(), "learnings"),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  const settingsFile = path.join(getGlobalConfigDir(), "settings.json");
  try {
    await fs.access(settingsFile);
  } catch {
    await fs.writeFile(
      settingsFile,
      JSON.stringify(
        {
          defaultModel: "gpt-4.1-mini",
          defaultProvider: "copilot",
          permissions: {
            allow: [
              "Bash(ls:*)",
              "Bash(pwd:*)",
              "Bash(cat:*)",
              "Bash(head:*)",
              "Bash(tail:*)",
              "Bash(grep:*)",
              "Bash(find:*)",
              "Bash(tree:*)",
              "Bash(wc:*)",
              "Bash(echo:*)",
              "Bash(git status:*)",
              "Bash(git diff:*)",
              "Bash(git log:*)",
              "Bash(git show:*)",
              "Bash(git ls-files:*)",
              "Bash(node --version:*)",
              "Bash(npm --version:*)",
              "Bash(npm ls:*)",
            ],
          },
        },
        null,
        2,
      ),
      "utf-8",
    );
  }
};

/**
 * Ensure local config exists
 */
const ensureLocalConfig = async (): Promise<void> => {
  const dirs = [
    getLocalConfigDir(),
    path.join(getLocalConfigDir(), "rules"),
    path.join(getLocalConfigDir(), "agents"),
    path.join(getLocalConfigDir(), "skills"),
    path.join(getLocalConfigDir(), "learnings"),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  const settingsFile = path.join(getLocalConfigDir(), "settings.json");
  try {
    await fs.access(settingsFile);
  } catch {
    await fs.writeFile(
      settingsFile,
      JSON.stringify(
        {
          permissions: { allow: [] },
          ignorePaths: ["node_modules", ".git", "dist"],
        },
        null,
        2,
      ),
      "utf-8",
    );
  }
};

/**
 * Auto-initialize config directories
 */
export const autoInitialize = async (): Promise<void> => {
  if (initialized) return;
  await ensureGlobalConfig();
  await ensureLocalConfig();
  initialized = true;
};

/**
 * Initialize project config directory
 */
export const initProject = async (): Promise<void> => {
  const dirs = [
    getLocalConfigDir(),
    path.join(getLocalConfigDir(), "rules"),
    path.join(getLocalConfigDir(), "agents"),
    path.join(getLocalConfigDir(), "skills"),
    path.join(getLocalConfigDir(), "learnings"),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  const settingsFile = path.join(getLocalConfigDir(), "settings.json");
  try {
    await fs.access(settingsFile);
  } catch {
    await fs.writeFile(
      settingsFile,
      JSON.stringify(
        {
          defaultModel: "gpt-5-mini",
          defaultProvider: "copilot",
          autoApprove: [],
          ignorePaths: ["node_modules", ".git", "dist"],
        } as ProjectSettings,
        null,
        2,
      ),
      "utf-8",
    );
  }

  const exampleRule = path.join(getLocalConfigDir(), "rules", "code-style.md");
  try {
    await fs.access(exampleRule);
  } catch {
    await fs.writeFile(
      exampleRule,
      `# Code Style Rules

These rules apply to all code generation in this project.

- Follow existing code conventions
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
`,
      "utf-8",
    );
  }
};

/**
 * Initialize global config directory
 */
export const initGlobal = async (): Promise<void> => {
  const dirs = [
    getGlobalConfigDir(),
    path.join(getGlobalConfigDir(), "rules"),
    path.join(getGlobalConfigDir(), "agents"),
    path.join(getGlobalConfigDir(), "skills"),
    path.join(getGlobalConfigDir(), "learnings"),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
};

/**
 * Get project settings (merged local + global)
 */
export const getSettings = async (): Promise<ProjectSettings> => {
  const globalSettings = await loadJsonFile<ProjectSettings>(
    path.join(getGlobalConfigDir(), "settings.json"),
    {},
  );
  const localSettings = await loadJsonFile<ProjectSettings>(
    path.join(getLocalConfigDir(), "settings.json"),
    {},
  );

  return { ...globalSettings, ...localSettings };
};

/**
 * Save project settings
 */
export const saveSettings = async (
  settings: Partial<ProjectSettings>,
  global = false,
): Promise<void> => {
  const configDir = global ? getGlobalConfigDir() : getLocalConfigDir();
  const filePath = path.join(configDir, "settings.json");

  const existing = await loadJsonFile<ProjectSettings>(filePath, {});
  const merged = { ...existing, ...settings };

  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(merged, null, 2), "utf-8");
};

/**
 * Get all rules (merged local + global)
 */
export const getRules = async (): Promise<RuleConfig[]> => {
  const globalRules = await loadRulesFromDir(
    path.join(getGlobalConfigDir(), "rules"),
  );
  const localRules = await loadRulesFromDir(
    path.join(getLocalConfigDir(), "rules"),
  );

  return [...globalRules, ...localRules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
};

/**
 * Add a rule
 */
export const addRule = async (
  name: string,
  content: string,
  global = false,
): Promise<void> => {
  const configDir = global ? getGlobalConfigDir() : getLocalConfigDir();
  const rulesDir = path.join(configDir, "rules");

  await fs.mkdir(rulesDir, { recursive: true });
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  await fs.writeFile(path.join(rulesDir, fileName), content, "utf-8");
};

/**
 * Get all agents (merged local + global)
 */
export const getAgents = async (): Promise<AgentConfig[]> => {
  const globalAgents = await loadJsonConfigs<AgentConfig>(
    path.join(getGlobalConfigDir(), "agents"),
  );
  const localAgents = await loadJsonConfigs<AgentConfig>(
    path.join(getLocalConfigDir(), "agents"),
  );

  const agentMap = new Map<string, AgentConfig>();
  for (const agent of [...globalAgents, ...localAgents]) {
    agentMap.set(agent.name, agent);
  }

  return Array.from(agentMap.values());
};

/**
 * Add an agent
 */
export const addAgent = async (
  agent: AgentConfig,
  global = false,
): Promise<void> => {
  const configDir = global ? getGlobalConfigDir() : getLocalConfigDir();
  const agentsDir = path.join(configDir, "agents");

  await fs.mkdir(agentsDir, { recursive: true });
  await fs.writeFile(
    path.join(agentsDir, `${agent.name}.json`),
    JSON.stringify(agent, null, 2),
    "utf-8",
  );
};

/**
 * Get all skills (merged local + global)
 */
export const getSkills = async (): Promise<SkillConfig[]> => {
  const globalSkills = await loadJsonConfigs<SkillConfig>(
    path.join(getGlobalConfigDir(), "skills"),
  );
  const localSkills = await loadJsonConfigs<SkillConfig>(
    path.join(getLocalConfigDir(), "skills"),
  );

  const skillMap = new Map<string, SkillConfig>();
  for (const skill of [...globalSkills, ...localSkills]) {
    skillMap.set(skill.name, skill);
  }

  return Array.from(skillMap.values());
};

/**
 * Add a skill
 */
export const addSkill = async (
  skill: SkillConfig,
  global = false,
): Promise<void> => {
  const configDir = global ? getGlobalConfigDir() : getLocalConfigDir();
  const skillsDir = path.join(configDir, "skills");

  await fs.mkdir(skillsDir, { recursive: true });
  await fs.writeFile(
    path.join(skillsDir, `${skill.name}.json`),
    JSON.stringify(skill, null, 2),
    "utf-8",
  );
};

/**
 * Get all learnings
 */
export const getLearnings = async (): Promise<LearningEntry[]> => {
  const globalLearnings = await loadJsonConfigs<LearningEntry>(
    path.join(getGlobalConfigDir(), "learnings"),
  );
  const localLearnings = await loadJsonConfigs<LearningEntry>(
    path.join(getLocalConfigDir(), "learnings"),
  );

  return [...globalLearnings, ...localLearnings].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
};

/**
 * Add a learning
 */
export const addLearning = async (
  content: string,
  context?: string,
  global = false,
): Promise<LearningEntry> => {
  const configDir = global ? getGlobalConfigDir() : getLocalConfigDir();
  const learningsDir = path.join(configDir, "learnings");

  await fs.mkdir(learningsDir, { recursive: true });

  const entry: LearningEntry = {
    id: `learning_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    content,
    context,
    createdAt: Date.now(),
  };

  await fs.writeFile(
    path.join(learningsDir, `${entry.id}.json`),
    JSON.stringify(entry, null, 2),
    "utf-8",
  );

  return entry;
};

/**
 * Build system prompt additions from rules
 */
export const buildRulesPrompt = async (): Promise<string> => {
  const rules = await getRules();
  if (rules.length === 0) return "";

  return rules.map((r) => `## ${r.name}\n\n${r.content}`).join("\n\n---\n\n");
};

/**
 * Build learnings context (simple, most recent)
 */
export const buildLearningsContext = async (): Promise<string> => {
  const learnings = await getLearnings();
  if (learnings.length === 0) return "";

  return (
    "## Project Learnings\n\n" +
    learnings
      .slice(0, 20)
      .map((l) => `- ${l.content}`)
      .join("\n")
  );
};

/**
 * Build learnings context with semantic search
 */
export const buildRelevantLearningsContext = async (
  query: string,
  maxLearnings = 10,
): Promise<string> => {
  const { searchLearnings } =
    await import("@services/learning/semantic-search");
  const learnings = await getLearnings();

  if (learnings.length === 0) return "";

  const results = await searchLearnings(query, learnings, {
    topK: maxLearnings,
    minSimilarity: 0.3,
  });

  if (results.length === 0) {
    // Fallback to most recent
    return (
      "## Project Learnings\n\n" +
      learnings
        .slice(0, maxLearnings)
        .map((l) => `- ${l.content}`)
        .join("\n")
    );
  }

  return (
    "## Relevant Project Learnings\n\n" +
    results.map((r) => `- ${r.item.content}`).join("\n")
  );
};

/**
 * Set working directory
 */
export const setWorkingDir = (dir: string): void => {
  workingDir = dir;
};

// Re-export types
export type {
  AgentConfig,
  SkillConfig,
  RuleConfig,
  LearningEntry,
  ProjectSettings,
} from "@/types/project-config";

/**
 * Legacy compatibility - project config object
 */
export const projectConfig = {
  autoInitialize,
  initProject,
  initGlobal,
  getSettings,
  saveSettings,
  getRules,
  addRule,
  getAgents,
  addAgent,
  getSkills,
  addSkill,
  getLearnings,
  addLearning,
  buildRulesPrompt,
  buildLearningsContext,
};
