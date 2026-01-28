/**
 * Command suggestion types
 */

export type SuggestionPriority = "high" | "medium" | "low";

export interface CommandSuggestion {
  command: string;
  description: string;
  priority: SuggestionPriority;
  reason: string;
}

export interface ProjectContext {
  hasPackageJson: boolean;
  hasYarnLock: boolean;
  hasPnpmLock: boolean;
  hasBunLock: boolean;
  hasCargoToml: boolean;
  hasGoMod: boolean;
  hasPyproject: boolean;
  hasRequirements: boolean;
  hasMakefile: boolean;
  hasDockerfile: boolean;
  cwd: string;
}

export interface SuggestionPattern {
  filePatterns: RegExp[];
  contentPatterns?: RegExp[];
  suggestions: (ctx: ProjectContext, filePath: string) => CommandSuggestion[];
}

export interface CommandSuggestionState {
  pendingSuggestions: Map<string, CommandSuggestion>;
  projectContext: ProjectContext | null;
}
