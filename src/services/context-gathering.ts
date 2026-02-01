/**
 * Context Gathering Service
 *
 * Automatically gathers project context for ask mode.
 * Provides codebase overview without requiring manual file references.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export interface ProjectContext {
  projectType: string;
  name?: string;
  description?: string;
  mainLanguage: string;
  frameworks: string[];
  structure: string;
  keyFiles: string[];
  dependencies?: string[];
}

interface ProjectConfig {
  name?: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

const PROJECT_MARKERS: Record<string, { type: string; language: string }> = {
  "package.json": { type: "Node.js", language: "JavaScript/TypeScript" },
  "tsconfig.json": { type: "TypeScript", language: "TypeScript" },
  "Cargo.toml": { type: "Rust", language: "Rust" },
  "go.mod": { type: "Go", language: "Go" },
  "pom.xml": { type: "Maven/Java", language: "Java" },
  "build.gradle": { type: "Gradle/Java", language: "Java" },
  "pyproject.toml": { type: "Python", language: "Python" },
  "setup.py": { type: "Python", language: "Python" },
  "requirements.txt": { type: "Python", language: "Python" },
  "Gemfile": { type: "Ruby", language: "Ruby" },
  "composer.json": { type: "PHP", language: "PHP" },
  ".csproj": { type: ".NET", language: "C#" },
};

const FRAMEWORK_MARKERS: Record<string, string[]> = {
  react: ["react", "react-dom", "next", "gatsby"],
  vue: ["vue", "nuxt"],
  angular: ["@angular/core"],
  svelte: ["svelte", "sveltekit"],
  express: ["express"],
  fastify: ["fastify"],
  nestjs: ["@nestjs/core"],
  django: ["django"],
  flask: ["flask"],
  rails: ["rails"],
  spring: ["spring-boot"],
};

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  "vendor",
  ".idea",
  ".vscode",
  "coverage",
]);

const detectProjectType = (workingDir: string): { type: string; language: string } => {
  for (const [marker, info] of Object.entries(PROJECT_MARKERS)) {
    if (existsSync(join(workingDir, marker))) {
      return info;
    }
  }
  return { type: "Unknown", language: "Unknown" };
};

const detectFrameworks = (deps: Record<string, string>): string[] => {
  const frameworks: string[] = [];

  for (const [framework, markers] of Object.entries(FRAMEWORK_MARKERS)) {
    for (const marker of markers) {
      if (deps[marker]) {
        frameworks.push(framework);
        break;
      }
    }
  }

  return frameworks;
};

const readPackageJson = (workingDir: string): ProjectConfig | null => {
  const packagePath = join(workingDir, "package.json");
  if (!existsSync(packagePath)) return null;

  try {
    const content = readFileSync(packagePath, "utf-8");
    return JSON.parse(content) as ProjectConfig;
  } catch {
    return null;
  }
};

const getDirectoryStructure = (
  dir: string,
  baseDir: string,
  depth = 0,
  maxDepth = 3,
): string[] => {
  if (depth >= maxDepth) return [];

  const entries: string[] = [];
  try {
    const items = readdirSync(dir);

    for (const item of items) {
      if (IGNORED_DIRS.has(item) || item.startsWith(".")) continue;

      const fullPath = join(dir, item);

      try {
        const stat = statSync(fullPath);
        const indent = "  ".repeat(depth);

        if (stat.isDirectory()) {
          entries.push(`${indent}${item}/`);
          const subEntries = getDirectoryStructure(fullPath, baseDir, depth + 1, maxDepth);
          entries.push(...subEntries);
        } else if (depth < 2) {
          entries.push(`${indent}${item}`);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return entries;
};

const getKeyFiles = (workingDir: string): string[] => {
  const keyPatterns = [
    "README.md",
    "readme.md",
    "README",
    "package.json",
    "tsconfig.json",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    ".env.example",
    "docker-compose.yml",
    "Dockerfile",
    "Makefile",
  ];

  const found: string[] = [];
  for (const pattern of keyPatterns) {
    if (existsSync(join(workingDir, pattern))) {
      found.push(pattern);
    }
  }

  return found;
};

const getMainDependencies = (pkg: ProjectConfig): string[] => {
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const importantDeps = Object.keys(allDeps).filter(
    (dep) =>
      !dep.startsWith("@types/") &&
      !dep.startsWith("eslint") &&
      !dep.startsWith("prettier") &&
      !dep.includes("lint"),
  );

  return importantDeps.slice(0, 15);
};

/**
 * Gather comprehensive project context
 */
export const gatherProjectContext = (workingDir: string): ProjectContext => {
  const { type, language } = detectProjectType(workingDir);
  const pkg = readPackageJson(workingDir);
  const structure = getDirectoryStructure(workingDir, workingDir);
  const keyFiles = getKeyFiles(workingDir);

  const frameworks = pkg
    ? detectFrameworks({ ...pkg.dependencies, ...pkg.devDependencies })
    : [];

  const dependencies = pkg ? getMainDependencies(pkg) : undefined;

  return {
    projectType: type,
    name: pkg?.name,
    description: pkg?.description,
    mainLanguage: language,
    frameworks,
    structure: structure.slice(0, 50).join("\n"),
    keyFiles,
    dependencies,
  };
};

/**
 * Build a formatted context string for injection into prompts
 */
export const buildProjectContextString = (context: ProjectContext): string => {
  const sections: string[] = [];

  const header = context.name
    ? `Project: ${context.name}`
    : `Project Type: ${context.projectType}`;
  sections.push(header);

  if (context.description) {
    sections.push(`Description: ${context.description}`);
  }

  sections.push(`Language: ${context.mainLanguage}`);

  if (context.frameworks.length > 0) {
    sections.push(`Frameworks: ${context.frameworks.join(", ")}`);
  }

  if (context.keyFiles.length > 0) {
    sections.push(`Key Files: ${context.keyFiles.join(", ")}`);
  }

  if (context.dependencies && context.dependencies.length > 0) {
    sections.push(`Main Dependencies: ${context.dependencies.join(", ")}`);
  }

  if (context.structure) {
    sections.push(`\nProject Structure:\n\`\`\`\n${context.structure}\n\`\`\``);
  }

  return sections.join("\n");
};

/**
 * Get project context for ask mode prompts
 */
export const getProjectContextForAskMode = (workingDir: string): string => {
  const context = gatherProjectContext(workingDir);
  return buildProjectContextString(context);
};
