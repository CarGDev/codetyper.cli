/**
 * Glob tool constants
 */

export const GLOB_DEFAULTS = {
  DOT: false,
  ONLY_FILES: true,
  ONLY_DIRECTORIES: false,
} as const;

export const GLOB_IGNORE_PATTERNS = [
  // Version control
  "**/.git/**",
  "**/.svn/**",
  "**/.hg/**",
  // AI/Code assistants
  "**/.claude/**",
  "**/.coder/**",
  "**/.codetyper/**",
  "**/.cursor/**",
  "**/.copilot/**",
  "**/.aider/**",
  // Build outputs / binaries
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/bin/**",
  "**/obj/**",
  "**/target/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/out/**",
  // Cache directories
  "**/.cache/**",
  "**/.turbo/**",
  "**/.parcel-cache/**",
  "**/.vite/**",
  // Test/Coverage
  "**/coverage/**",
  "**/.nyc_output/**",
  // Python
  "**/__pycache__/**",
  "**/.venv/**",
  "**/venv/**",
  "**/.env/**",
  // IDE/Editor
  "**/.idea/**",
  "**/.vscode/**",
  // Misc
  "**/.terraform/**",
  "**/.serverless/**",
] as const;

export const GLOB_MESSAGES = {
  FAILED: (error: unknown) => `Glob failed: ${error}`,
  LIST_FAILED: (error: unknown) => `List failed: ${error}`,
} as const;
