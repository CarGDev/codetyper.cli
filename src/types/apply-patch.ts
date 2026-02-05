export type PatchLineType =
  | "context" // Unchanged line (starts with space)
  | "addition" // Added line (starts with +)
  | "deletion" // Removed line (starts with -)
  | "header"; // Hunk header

export interface PatchLine {
  type: PatchLineType;
  content: string;
  originalLineNumber?: number;
  newLineNumber?: number;
}

export interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: PatchLine[];
  header: string;
}

export interface ParsedFilePatch {
  oldPath: string;
  newPath: string;
  hunks: PatchHunk[];
  isBinary: boolean;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

export interface ParsedPatch {
  files: ParsedFilePatch[];
  rawPatch: string;
}

export interface FuzzyMatchResult {
  found: boolean;
  lineNumber: number;
  offset: number;
  confidence: number;
}

export interface HunkApplicationResult {
  success: boolean;
  hunkIndex: number;
  appliedAt?: number;
  error?: string;
  fuzzyOffset?: number;
}

export interface FilePatchResult {
  success: boolean;
  filePath: string;
  hunksApplied: number;
  hunksFailed: number;
  hunkResults: HunkApplicationResult[];
  newContent?: string;
  error?: string;
}

export interface ApplyPatchResult {
  success: boolean;
  filesPatched: number;
  filesFailed: number;
  fileResults: FilePatchResult[];
  rollbackAvailable: boolean;
  error?: string;
}

export interface ApplyPatchParams {
  patch: string;
  targetFile?: string;
  dryRun?: boolean;
  fuzz?: number;
  reverse?: boolean;
}

export interface PatchRollback {
  filePath: string;
  originalContent: string;
  patchedContent: string;
  timestamp: number;
}

export interface PatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileCount: number;
  hunkCount: number;
}

export interface ContextMatchOptions {
  fuzz: number;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
}
