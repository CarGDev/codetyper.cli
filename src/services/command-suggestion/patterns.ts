/**
 * Command suggestion patterns
 */

import {
  FILE_PATTERNS,
  CONTENT_PATTERNS,
  SUGGESTION_MESSAGES,
  SUGGESTION_REASONS,
} from "@constants/command-suggestion";
import { getPackageManager } from "@services/command-suggestion/context";
import type {
  SuggestionPattern,
  ProjectContext,
  CommandSuggestion,
} from "@/types/command-suggestion";

const createPackageJsonSuggestions = (
  ctx: ProjectContext,
): CommandSuggestion[] => {
  const pm = getPackageManager(ctx);
  return [
    {
      command: `${pm} install`,
      description: SUGGESTION_MESSAGES.INSTALL_DEPS,
      priority: "high",
      reason: SUGGESTION_REASONS.PACKAGE_JSON_MODIFIED,
    },
  ];
};

const createTsconfigSuggestions = (
  ctx: ProjectContext,
): CommandSuggestion[] => {
  const pm = getPackageManager(ctx);
  return [
    {
      command: `${pm} run build`,
      description: SUGGESTION_MESSAGES.REBUILD_PROJECT,
      priority: "medium",
      reason: SUGGESTION_REASONS.TSCONFIG_CHANGED,
    },
  ];
};

const createSourceFileSuggestions = (
  ctx: ProjectContext,
  filePath: string,
): CommandSuggestion[] => {
  const pm = getPackageManager(ctx);
  const isTestFile = FILE_PATTERNS.TEST_FILE.test(filePath);

  return isTestFile
    ? [
        {
          command: `${pm} test`,
          description: SUGGESTION_MESSAGES.RUN_TESTS,
          priority: "high",
          reason: SUGGESTION_REASONS.TEST_FILE_MODIFIED,
        },
      ]
    : [
        {
          command: `${pm} run dev`,
          description: SUGGESTION_MESSAGES.START_DEV,
          priority: "low",
          reason: SUGGESTION_REASONS.SOURCE_FILE_MODIFIED,
        },
      ];
};

const createCargoSuggestions = (): CommandSuggestion[] => [
  {
    command: "cargo build",
    description: SUGGESTION_MESSAGES.BUILD_RUST,
    priority: "high",
    reason: SUGGESTION_REASONS.CARGO_MODIFIED,
  },
];

const createGoModSuggestions = (): CommandSuggestion[] => [
  {
    command: "go mod tidy",
    description: SUGGESTION_MESSAGES.TIDY_GO,
    priority: "high",
    reason: SUGGESTION_REASONS.GO_MOD_MODIFIED,
  },
];

const createPythonSuggestions = (ctx: ProjectContext): CommandSuggestion[] =>
  ctx.hasPyproject
    ? [
        {
          command: "pip install -e .",
          description: SUGGESTION_MESSAGES.INSTALL_PYTHON_EDITABLE,
          priority: "high",
          reason: SUGGESTION_REASONS.PYTHON_DEPS_CHANGED,
        },
      ]
    : [
        {
          command: "pip install -r requirements.txt",
          description: SUGGESTION_MESSAGES.INSTALL_PYTHON_DEPS,
          priority: "high",
          reason: SUGGESTION_REASONS.REQUIREMENTS_MODIFIED,
        },
      ];

const createDockerSuggestions = (
  _ctx: ProjectContext,
  filePath: string,
): CommandSuggestion[] =>
  filePath.includes("docker-compose")
    ? [
        {
          command: "docker-compose up --build",
          description: SUGGESTION_MESSAGES.DOCKER_COMPOSE_BUILD,
          priority: "medium",
          reason: SUGGESTION_REASONS.DOCKER_COMPOSE_CHANGED,
        },
      ]
    : [
        {
          command: "docker build -t app .",
          description: SUGGESTION_MESSAGES.DOCKER_BUILD,
          priority: "medium",
          reason: SUGGESTION_REASONS.DOCKERFILE_MODIFIED,
        },
      ];

const createMakefileSuggestions = (): CommandSuggestion[] => [
  {
    command: "make",
    description: SUGGESTION_MESSAGES.RUN_MAKE,
    priority: "medium",
    reason: SUGGESTION_REASONS.MAKEFILE_MODIFIED,
  },
];

const createMigrationSuggestions = (
  ctx: ProjectContext,
): CommandSuggestion[] => {
  const pm = getPackageManager(ctx);
  return [
    {
      command: `${pm} run migrate`,
      description: SUGGESTION_MESSAGES.RUN_MIGRATE,
      priority: "high",
      reason: SUGGESTION_REASONS.MIGRATION_MODIFIED,
    },
  ];
};

const createEnvSuggestions = (): CommandSuggestion[] => [
  {
    command: "cp .env.example .env",
    description: SUGGESTION_MESSAGES.CREATE_ENV,
    priority: "medium",
    reason: SUGGESTION_REASONS.ENV_TEMPLATE_MODIFIED,
  },
];

const createLinterSuggestions = (ctx: ProjectContext): CommandSuggestion[] => {
  const pm = getPackageManager(ctx);
  return [
    {
      command: `${pm} run lint`,
      description: SUGGESTION_MESSAGES.RUN_LINT,
      priority: "low",
      reason: SUGGESTION_REASONS.LINTER_CONFIG_CHANGED,
    },
  ];
};

export const SUGGESTION_PATTERNS: SuggestionPattern[] = [
  {
    filePatterns: [FILE_PATTERNS.PACKAGE_JSON],
    contentPatterns: [
      CONTENT_PATTERNS.DEPENDENCIES,
      CONTENT_PATTERNS.DEV_DEPENDENCIES,
      CONTENT_PATTERNS.PEER_DEPENDENCIES,
    ],
    suggestions: createPackageJsonSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.TSCONFIG],
    suggestions: createTsconfigSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.SOURCE_FILES],
    suggestions: createSourceFileSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.CARGO_TOML],
    suggestions: createCargoSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.GO_MOD],
    suggestions: createGoModSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.PYTHON_DEPS],
    suggestions: createPythonSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.DOCKER],
    suggestions: createDockerSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.MAKEFILE],
    suggestions: createMakefileSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.MIGRATIONS],
    suggestions: createMigrationSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.ENV_EXAMPLE],
    suggestions: createEnvSuggestions,
  },
  {
    filePatterns: [FILE_PATTERNS.LINTER_CONFIG],
    suggestions: createLinterSuggestions,
  },
];
