/**
 * Command suggestion constants
 */

import type { SuggestionPriority } from "@/types/command-suggestion";

export const PROJECT_FILES = {
  PACKAGE_JSON: "package.json",
  YARN_LOCK: "yarn.lock",
  PNPM_LOCK: "pnpm-lock.yaml",
  BUN_LOCK: "bun.lockb",
  CARGO_TOML: "Cargo.toml",
  GO_MOD: "go.mod",
  PYPROJECT: "pyproject.toml",
  REQUIREMENTS: "requirements.txt",
  MAKEFILE: "Makefile",
  DOCKERFILE: "Dockerfile",
} as const;

export const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_ICONS: Record<SuggestionPriority, string> = {
  high: "⚡",
  medium: "→",
  low: "·",
};

export const FILE_PATTERNS = {
  PACKAGE_JSON: /package\.json$/,
  TSCONFIG: /tsconfig.*\.json$/,
  SOURCE_FILES: /\.(ts|tsx|js|jsx)$/,
  CARGO_TOML: /Cargo\.toml$/,
  GO_MOD: /go\.mod$/,
  PYTHON_DEPS: /requirements.*\.txt$|pyproject\.toml$/,
  DOCKER: /Dockerfile$|docker-compose.*\.ya?ml$/,
  MAKEFILE: /Makefile$/,
  MIGRATIONS: /migrations?\/.*\.(sql|ts|js)$/,
  ENV_EXAMPLE: /\.env\.example$|\.env\.sample$/,
  LINTER_CONFIG: /\.eslintrc|\.prettierrc|eslint\.config|prettier\.config/,
  TEST_FILE: /\.test\.|\.spec\.|__tests__/,
} as const;

export const CONTENT_PATTERNS = {
  DEPENDENCIES: /\"dependencies\"/,
  DEV_DEPENDENCIES: /\"devDependencies\"/,
  PEER_DEPENDENCIES: /\"peerDependencies\"/,
} as const;

export const SUGGESTION_MESSAGES = {
  INSTALL_DEPS: "Install dependencies",
  REBUILD_PROJECT: "Rebuild the project",
  RUN_TESTS: "Run tests",
  START_DEV: "Start development server",
  BUILD_RUST: "Build the Rust project",
  TIDY_GO: "Tidy Go modules",
  INSTALL_PYTHON_EDITABLE: "Install Python package in editable mode",
  INSTALL_PYTHON_DEPS: "Install Python dependencies",
  DOCKER_COMPOSE_BUILD: "Rebuild and start Docker containers",
  DOCKER_BUILD: "Rebuild Docker image",
  RUN_MAKE: "Run make",
  RUN_MIGRATE: "Run database migrations",
  CREATE_ENV: "Create local .env file",
  RUN_LINT: "Run linter to check for issues",
} as const;

export const SUGGESTION_REASONS = {
  PACKAGE_JSON_MODIFIED: "package.json was modified",
  TSCONFIG_CHANGED: "TypeScript configuration changed",
  TEST_FILE_MODIFIED: "Test file was modified",
  SOURCE_FILE_MODIFIED: "Source file was modified",
  CARGO_MODIFIED: "Cargo.toml was modified",
  GO_MOD_MODIFIED: "go.mod was modified",
  PYTHON_DEPS_CHANGED: "Python dependencies changed",
  REQUIREMENTS_MODIFIED: "requirements.txt was modified",
  DOCKER_COMPOSE_CHANGED: "Docker Compose configuration changed",
  DOCKERFILE_MODIFIED: "Dockerfile was modified",
  MAKEFILE_MODIFIED: "Makefile was modified",
  MIGRATION_MODIFIED: "Migration file was added or modified",
  ENV_TEMPLATE_MODIFIED: "Environment template was modified",
  LINTER_CONFIG_CHANGED: "Linter configuration changed",
} as const;
