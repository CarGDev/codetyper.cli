/**
 * Multi-project Brain support types
 * Switch between different Brain projects/knowledge bases
 */

export interface BrainProject {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly rootPath: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly stats: BrainProjectStats;
  readonly settings: BrainProjectSettings;
  readonly isActive: boolean;
}

export interface BrainProjectStats {
  readonly conceptCount: number;
  readonly memoryCount: number;
  readonly relationshipCount: number;
  readonly lastSyncAt?: number;
  readonly totalTokensUsed: number;
}

export interface BrainProjectSettings {
  readonly autoLearn: boolean;
  readonly autoRecall: boolean;
  readonly recallLimit: number;
  readonly contextInjection: boolean;
  readonly syncEnabled: boolean;
  readonly syncInterval: number; // minutes
}

export interface BrainProjectCreateInput {
  readonly name: string;
  readonly description?: string;
  readonly rootPath: string;
  readonly settings?: Partial<BrainProjectSettings>;
}

export interface BrainProjectUpdateInput {
  readonly name?: string;
  readonly description?: string;
  readonly settings?: Partial<BrainProjectSettings>;
}

export interface BrainProjectSwitchResult {
  readonly success: boolean;
  readonly previousProject?: BrainProject;
  readonly currentProject: BrainProject;
  readonly message: string;
}

export interface BrainProjectListResult {
  readonly projects: ReadonlyArray<BrainProject>;
  readonly activeProjectId?: number;
  readonly total: number;
}

export interface BrainProjectExport {
  readonly project: BrainProject;
  readonly concepts: ReadonlyArray<ExportedConcept>;
  readonly memories: ReadonlyArray<ExportedMemory>;
  readonly relationships: ReadonlyArray<ExportedRelationship>;
  readonly exportedAt: number;
  readonly version: string;
}

export interface ExportedConcept {
  readonly name: string;
  readonly whatItDoes: string;
  readonly keywords: ReadonlyArray<string>;
  readonly patterns: ReadonlyArray<string>;
  readonly files: ReadonlyArray<string>;
  readonly importance: number;
}

export interface ExportedMemory {
  readonly content: string;
  readonly type: string;
  readonly tags: ReadonlyArray<string>;
  readonly createdAt: number;
}

export interface ExportedRelationship {
  readonly sourceConcept: string;
  readonly targetConcept: string;
  readonly relationType: string;
  readonly weight: number;
}

export interface BrainProjectImportResult {
  readonly success: boolean;
  readonly project: BrainProject;
  readonly imported: {
    readonly concepts: number;
    readonly memories: number;
    readonly relationships: number;
  };
  readonly errors: ReadonlyArray<string>;
}

export const DEFAULT_BRAIN_PROJECT_SETTINGS: BrainProjectSettings = {
  autoLearn: true,
  autoRecall: true,
  recallLimit: 5,
  contextInjection: true,
  syncEnabled: false,
  syncInterval: 30,
};

export const BRAIN_PROJECT_EXPORT_VERSION = "1.0.0";
