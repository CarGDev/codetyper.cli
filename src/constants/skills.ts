/**
 * Skill System Constants
 *
 * Constants for skill loading, matching, and execution.
 */

import { join } from "path";
import { DIRS } from "@constants/paths";

/**
 * Skill file configuration
 */
export const SKILL_FILE = {
  NAME: "SKILL.md",
  FRONTMATTER_DELIMITER: "---",
  ENCODING: "utf-8",
} as const;

/**
 * Skill directories
 */
export const SKILL_DIRS = {
  BUILTIN: join(__dirname, "..", "skills"),
  USER: join(DIRS.config, "skills"),
  PROJECT: ".codetyper/skills",
} as const;

/**
 * External agent directories (relative to project root)
 * These directories may contain agent definition files from
 * various tools (Claude, GitHub Copilot, CodeTyper, etc.)
 */
export const EXTERNAL_AGENT_DIRS = {
  CLAUDE: ".claude",
  GITHUB: ".github",
  CODETYPER: ".codetyper",
} as const;

/**
 * Recognized external agent file patterns
 */
export const EXTERNAL_AGENT_FILES = {
  /** File extensions recognized as agent definitions */
  EXTENSIONS: [".md", ".yaml", ".yml"],
  /** Known agent file names (case-insensitive) */
  KNOWN_FILES: [
    "AGENTS.md",
    "agents.md",
    "AGENT.md",
    "agent.md",
    "SKILL.md",
    "copilot-instructions.md",
  ],
  /** Subdirectories to scan for agents */
  SUBDIRS: ["agents", "skills", "prompts"],
} as const;

/**
 * Skill loading configuration
 */
export const SKILL_LOADING = {
  CACHE_TTL_MS: 60000,
  MAX_SKILLS: 100,
  MAX_FILE_SIZE_BYTES: 100000,
} as const;

/**
 * Skill matching configuration
 */
export const SKILL_MATCHING = {
  MIN_CONFIDENCE: 0.7,
  EXACT_MATCH_BONUS: 0.3,
  COMMAND_PREFIX: "/",
  FUZZY_THRESHOLD: 0.6,
} as const;

/**
 * Default skill metadata values
 */
export const SKILL_DEFAULTS = {
  VERSION: "1.0.0",
  TRIGGER_TYPE: "command" as const,
  AUTO_TRIGGER: false,
  REQUIRED_TOOLS: [] as string[],
} as const;

/**
 * Skill error messages
 */
export const SKILL_ERRORS = {
  NOT_FOUND: (id: string) => `Skill not found: ${id}`,
  INVALID_FRONTMATTER: (file: string) => `Invalid frontmatter in: ${file}`,
  MISSING_REQUIRED_FIELD: (field: string, file: string) =>
    `Missing required field '${field}' in: ${file}`,
  LOAD_FAILED: (file: string, error: string) =>
    `Failed to load skill from ${file}: ${error}`,
  NO_MATCH: "No matching skill found for input",
  EXECUTION_FAILED: (id: string, error: string) =>
    `Skill execution failed for ${id}: ${error}`,
} as const;

/**
 * Skill titles for UI
 */
export const SKILL_TITLES = {
  LOADING: (name: string) => `Loading skill: ${name}`,
  EXECUTING: (name: string) => `Executing skill: ${name}`,
  MATCHED: (name: string, confidence: number) =>
    `Matched skill: ${name} (${(confidence * 100).toFixed(0)}%)`,
  COMPLETED: (name: string) => `Skill completed: ${name}`,
  FAILED: (name: string) => `Skill failed: ${name}`,
} as const;

/**
 * Built-in skill IDs
 */
export const BUILTIN_SKILLS = {
  COMMIT: "commit",
  REVIEW_PR: "review-pr",
  EXPLAIN: "explain",
  FEATURE_DEV: "feature-dev",
  TYPESCRIPT: "typescript",
  REACT: "react",
  CSS_SCSS: "css-scss",
  SECURITY: "security",
  CODE_AUDIT: "code-audit",
  RESEARCHER: "researcher",
  TESTING: "testing",
  PERFORMANCE: "performance",
  API_DESIGN: "api-design",
  DATABASE: "database",
  DEVOPS: "devops",
  ACCESSIBILITY: "accessibility",
  DOCUMENTATION: "documentation",
  REFACTORING: "refactoring",
  GIT_WORKFLOW: "git-workflow",
  NODE_BACKEND: "node-backend",
} as const;

/**
 * Skill auto-detection keyword map.
 * Maps keywords found in user prompts to skill IDs.
 * Each entry: [keyword, skillId, category, weight]
 */
export const SKILL_DETECTION_KEYWORDS: ReadonlyArray<
  readonly [string, string, string, number]
> = [
  // TypeScript
  ["typescript", "typescript", "language", 0.9],
  ["type error", "typescript", "language", 0.85],
  ["ts error", "typescript", "language", 0.85],
  ["generics", "typescript", "language", 0.8],
  ["type system", "typescript", "language", 0.85],
  ["interface", "typescript", "language", 0.5],
  ["type alias", "typescript", "language", 0.8],
  [".ts", "typescript", "language", 0.4],
  [".tsx", "typescript", "language", 0.5],

  // React
  ["react", "react", "framework", 0.9],
  ["component", "react", "framework", 0.5],
  ["hooks", "react", "framework", 0.7],
  ["usestate", "react", "framework", 0.9],
  ["useeffect", "react", "framework", 0.9],
  ["jsx", "react", "framework", 0.8],
  ["tsx", "react", "framework", 0.7],
  ["react component", "react", "framework", 0.95],
  ["props", "react", "framework", 0.5],
  ["useState", "react", "framework", 0.9],

  // CSS/SCSS
  ["css", "css-scss", "styling", 0.8],
  ["scss", "css-scss", "styling", 0.9],
  ["sass", "css-scss", "styling", 0.9],
  ["styling", "css-scss", "styling", 0.6],
  ["flexbox", "css-scss", "styling", 0.9],
  ["grid layout", "css-scss", "styling", 0.85],
  ["responsive", "css-scss", "styling", 0.6],
  ["animation", "css-scss", "styling", 0.5],
  ["tailwind", "css-scss", "styling", 0.7],

  // Security
  ["security", "security", "domain", 0.9],
  ["vulnerability", "security", "domain", 0.95],
  ["xss", "security", "domain", 0.95],
  ["sql injection", "security", "domain", 0.95],
  ["csrf", "security", "domain", 0.95],
  ["authentication", "security", "domain", 0.6],
  ["authorization", "security", "domain", 0.6],
  ["owasp", "security", "domain", 0.95],
  ["cve", "security", "domain", 0.9],
  ["penetration", "security", "domain", 0.85],

  // Code Audit
  ["audit", "code-audit", "domain", 0.85],
  ["code quality", "code-audit", "domain", 0.9],
  ["tech debt", "code-audit", "domain", 0.9],
  ["dead code", "code-audit", "domain", 0.9],
  ["complexity", "code-audit", "domain", 0.6],
  ["code smell", "code-audit", "domain", 0.9],
  ["code review", "code-audit", "domain", 0.5],

  // Research
  ["research", "researcher", "workflow", 0.8],
  ["find out", "researcher", "workflow", 0.5],
  ["look up", "researcher", "workflow", 0.5],
  ["documentation", "researcher", "workflow", 0.5],
  ["best practice", "researcher", "workflow", 0.6],
  ["compare", "researcher", "workflow", 0.4],

  // Testing
  ["test", "testing", "workflow", 0.5],
  ["testing", "testing", "workflow", 0.8],
  ["unit test", "testing", "workflow", 0.9],
  ["integration test", "testing", "workflow", 0.9],
  ["e2e", "testing", "workflow", 0.85],
  ["tdd", "testing", "workflow", 0.9],
  ["jest", "testing", "workflow", 0.85],
  ["vitest", "testing", "workflow", 0.9],
  ["playwright", "testing", "workflow", 0.9],
  ["coverage", "testing", "workflow", 0.6],

  // Performance
  ["performance", "performance", "domain", 0.8],
  ["optimization", "performance", "domain", 0.7],
  ["optimize", "performance", "domain", 0.7],
  ["slow", "performance", "domain", 0.5],
  ["bundle size", "performance", "domain", 0.9],
  ["memory leak", "performance", "domain", 0.9],
  ["latency", "performance", "domain", 0.7],
  ["profiling", "performance", "domain", 0.85],

  // API Design
  ["api", "api-design", "domain", 0.5],
  ["endpoint", "api-design", "domain", 0.6],
  ["rest", "api-design", "domain", 0.7],
  ["graphql", "api-design", "domain", 0.9],
  ["openapi", "api-design", "domain", 0.9],
  ["swagger", "api-design", "domain", 0.9],

  // Database
  ["database", "database", "domain", 0.9],
  ["sql", "database", "domain", 0.8],
  ["query", "database", "domain", 0.4],
  ["migration", "database", "domain", 0.7],
  ["schema", "database", "domain", 0.7],
  ["orm", "database", "domain", 0.85],
  ["prisma", "database", "domain", 0.9],
  ["drizzle", "database", "domain", 0.9],
  ["postgres", "database", "domain", 0.9],
  ["mysql", "database", "domain", 0.9],
  ["mongodb", "database", "domain", 0.9],

  // DevOps
  ["devops", "devops", "domain", 0.9],
  ["docker", "devops", "domain", 0.9],
  ["ci/cd", "devops", "domain", 0.9],
  ["pipeline", "devops", "domain", 0.7],
  ["deploy", "devops", "domain", 0.7],
  ["kubernetes", "devops", "domain", 0.95],
  ["k8s", "devops", "domain", 0.95],
  ["github actions", "devops", "domain", 0.9],

  // Accessibility
  ["accessibility", "accessibility", "domain", 0.95],
  ["a11y", "accessibility", "domain", 0.95],
  ["wcag", "accessibility", "domain", 0.95],
  ["aria", "accessibility", "domain", 0.85],
  ["screen reader", "accessibility", "domain", 0.9],

  // Documentation
  ["documentation", "documentation", "workflow", 0.7],
  ["readme", "documentation", "workflow", 0.8],
  ["jsdoc", "documentation", "workflow", 0.9],
  ["document this", "documentation", "workflow", 0.7],

  // Refactoring
  ["refactor", "refactoring", "workflow", 0.9],
  ["refactoring", "refactoring", "workflow", 0.9],
  ["clean up", "refactoring", "workflow", 0.6],
  ["restructure", "refactoring", "workflow", 0.7],
  ["simplify", "refactoring", "workflow", 0.5],
  ["solid principles", "refactoring", "workflow", 0.85],
  ["design pattern", "refactoring", "workflow", 0.7],

  // Git
  ["git", "git-workflow", "tool", 0.5],
  ["branch", "git-workflow", "tool", 0.4],
  ["merge conflict", "git-workflow", "tool", 0.9],
  ["rebase", "git-workflow", "tool", 0.85],
  ["cherry-pick", "git-workflow", "tool", 0.9],

  // Node.js Backend
  ["express", "node-backend", "framework", 0.85],
  ["fastify", "node-backend", "framework", 0.9],
  ["middleware", "node-backend", "framework", 0.6],
  ["api server", "node-backend", "framework", 0.8],
  ["backend", "node-backend", "framework", 0.5],
  ["server", "node-backend", "framework", 0.4],
] as const;

/**
 * Minimum confidence for auto-detection to trigger
 */
export const SKILL_AUTO_DETECT_THRESHOLD = 0.6;

/**
 * Maximum number of skills to auto-activate per prompt
 */
export const SKILL_AUTO_DETECT_MAX = 3;

/**
 * Skill trigger patterns for common commands
 */
export const SKILL_TRIGGER_PATTERNS = {
  COMMIT: [
    "/commit",
    "commit changes",
    "commit this",
    "git commit",
    "make a commit",
  ],
  REVIEW_PR: [
    "/review-pr",
    "/review",
    "review pr",
    "review this pr",
    "review pull request",
    "code review",
  ],
  EXPLAIN: [
    "/explain",
    "explain this",
    "explain code",
    "what does this do",
    "how does this work",
  ],
  FEATURE_DEV: [
    "/feature",
    "/feature-dev",
    "implement feature",
    "new feature",
    "build feature",
  ],
} as const;

/**
 * Required fields in skill frontmatter
 */
export const SKILL_REQUIRED_FIELDS = [
  "id",
  "name",
  "description",
  "triggers",
] as const;
