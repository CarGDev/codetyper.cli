/**
 * Project context detection
 */

import { existsSync } from "fs";
import { join } from "path";

import { PROJECT_FILES } from "@constants/command-suggestion";
import type { ProjectContext } from "@/types/command-suggestion";

export const detectProjectContext = (cwd: string): ProjectContext => ({
  hasPackageJson: existsSync(join(cwd, PROJECT_FILES.PACKAGE_JSON)),
  hasYarnLock: existsSync(join(cwd, PROJECT_FILES.YARN_LOCK)),
  hasPnpmLock: existsSync(join(cwd, PROJECT_FILES.PNPM_LOCK)),
  hasBunLock: existsSync(join(cwd, PROJECT_FILES.BUN_LOCK)),
  hasCargoToml: existsSync(join(cwd, PROJECT_FILES.CARGO_TOML)),
  hasGoMod: existsSync(join(cwd, PROJECT_FILES.GO_MOD)),
  hasPyproject: existsSync(join(cwd, PROJECT_FILES.PYPROJECT)),
  hasRequirements: existsSync(join(cwd, PROJECT_FILES.REQUIREMENTS)),
  hasMakefile: existsSync(join(cwd, PROJECT_FILES.MAKEFILE)),
  hasDockerfile: existsSync(join(cwd, PROJECT_FILES.DOCKERFILE)),
  cwd,
});

const PACKAGE_MANAGER_PRIORITY: Array<{
  check: (ctx: ProjectContext) => boolean;
  manager: string;
}> = [
  { check: (ctx) => ctx.hasBunLock, manager: "bun" },
  { check: (ctx) => ctx.hasPnpmLock, manager: "pnpm" },
  { check: (ctx) => ctx.hasYarnLock, manager: "yarn" },
];

export const getPackageManager = (ctx: ProjectContext): string => {
  for (const { check, manager } of PACKAGE_MANAGER_PRIORITY) {
    if (check(ctx)) {
      return manager;
    }
  }
  return "npm";
};
