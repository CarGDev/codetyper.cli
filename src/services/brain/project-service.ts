/**
 * Brain project service
 * Manages multiple Brain projects/knowledge bases
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

import type {
  BrainProject,
  BrainProjectStats,
  BrainProjectSettings,
  BrainProjectCreateInput,
  BrainProjectUpdateInput,
  BrainProjectSwitchResult,
  BrainProjectListResult,
  BrainProjectExport,
  BrainProjectImportResult,
  ExportedConcept,
  ExportedMemory,
  ExportedRelationship,
} from "@src/types/brain-project";
import {
  DEFAULT_BRAIN_PROJECT_SETTINGS,
  BRAIN_PROJECT_EXPORT_VERSION,
} from "@src/types/brain-project";
import {
  BRAIN_PROJECT,
  BRAIN_PROJECT_STORAGE,
  BRAIN_PROJECT_PATHS,
  BRAIN_PROJECT_MESSAGES,
  BRAIN_PROJECT_API,
} from "@src/constants/brain-project";

interface ProjectServiceState {
  projects: Map<number, BrainProject>;
  activeProjectId: number | null;
  configPath: string;
  initialized: boolean;
}

const state: ProjectServiceState = {
  projects: new Map(),
  activeProjectId: null,
  configPath: join(homedir(), ".local", "share", "codetyper", BRAIN_PROJECT_STORAGE.CONFIG_FILE),
  initialized: false,
};

const ensureDirectories = async (): Promise<void> => {
  const paths = [
    join(homedir(), ".local", "share", "codetyper", "brain"),
    join(homedir(), ".local", "share", "codetyper", "brain", "exports"),
    join(homedir(), ".local", "share", "codetyper", "brain", "backups"),
  ];

  for (const path of paths) {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }
};

const loadProjectsFromConfig = async (): Promise<void> => {
  if (!existsSync(state.configPath)) {
    return;
  }

  try {
    const content = await readFile(state.configPath, "utf-8");
    const data = JSON.parse(content) as {
      projects: BrainProject[];
      activeProjectId: number | null;
    };

    state.projects.clear();
    data.projects.forEach((project) => {
      state.projects.set(project.id, project);
    });
    state.activeProjectId = data.activeProjectId;
  } catch {
    // Config file corrupted, start fresh
    state.projects.clear();
    state.activeProjectId = null;
  }
};

const saveProjectsToConfig = async (): Promise<void> => {
  await ensureDirectories();

  const data = {
    projects: Array.from(state.projects.values()),
    activeProjectId: state.activeProjectId,
    version: "1.0.0",
    updatedAt: Date.now(),
  };

  await writeFile(state.configPath, JSON.stringify(data, null, 2));
};

const generateProjectId = (): number => {
  const existingIds = Array.from(state.projects.keys());
  return existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
};

const createDefaultStats = (): BrainProjectStats => ({
  conceptCount: 0,
  memoryCount: 0,
  relationshipCount: 0,
  totalTokensUsed: 0,
});

// Public API

export const initialize = async (): Promise<void> => {
  if (state.initialized) return;

  await ensureDirectories();
  await loadProjectsFromConfig();
  state.initialized = true;
};

export const createProject = async (input: BrainProjectCreateInput): Promise<BrainProject> => {
  await initialize();

  // Validate name
  if (input.name.length < BRAIN_PROJECT.NAME_MIN_LENGTH) {
    throw new Error(BRAIN_PROJECT_MESSAGES.INVALID_NAME);
  }

  if (input.name.length > BRAIN_PROJECT.NAME_MAX_LENGTH) {
    throw new Error(BRAIN_PROJECT_MESSAGES.INVALID_NAME);
  }

  // Check for duplicate names
  const existingProject = Array.from(state.projects.values()).find(
    (p) => p.name.toLowerCase() === input.name.toLowerCase()
  );

  if (existingProject) {
    throw new Error(BRAIN_PROJECT_MESSAGES.ALREADY_EXISTS);
  }

  const now = Date.now();
  const project: BrainProject = {
    id: generateProjectId(),
    name: input.name,
    description: input.description || "",
    rootPath: input.rootPath,
    createdAt: now,
    updatedAt: now,
    stats: createDefaultStats(),
    settings: {
      ...DEFAULT_BRAIN_PROJECT_SETTINGS,
      ...input.settings,
    },
    isActive: false,
  };

  state.projects.set(project.id, project);
  await saveProjectsToConfig();

  return project;
};

export const updateProject = async (
  projectId: number,
  input: BrainProjectUpdateInput
): Promise<BrainProject> => {
  await initialize();

  const project = state.projects.get(projectId);
  if (!project) {
    throw new Error(BRAIN_PROJECT_MESSAGES.NOT_FOUND);
  }

  const updatedProject: BrainProject = {
    ...project,
    name: input.name ?? project.name,
    description: input.description ?? project.description,
    settings: input.settings
      ? { ...project.settings, ...input.settings }
      : project.settings,
    updatedAt: Date.now(),
  };

  state.projects.set(projectId, updatedProject);
  await saveProjectsToConfig();

  return updatedProject;
};

export const deleteProject = async (projectId: number): Promise<boolean> => {
  await initialize();

  const project = state.projects.get(projectId);
  if (!project) {
    return false;
  }

  // Can't delete active project
  if (state.activeProjectId === projectId) {
    state.activeProjectId = null;
  }

  state.projects.delete(projectId);
  await saveProjectsToConfig();

  return true;
};

export const switchProject = async (projectId: number): Promise<BrainProjectSwitchResult> => {
  await initialize();

  const newProject = state.projects.get(projectId);
  if (!newProject) {
    throw new Error(BRAIN_PROJECT_MESSAGES.NOT_FOUND);
  }

  const previousProject = state.activeProjectId
    ? state.projects.get(state.activeProjectId)
    : undefined;

  // Update active status
  if (previousProject) {
    state.projects.set(previousProject.id, { ...previousProject, isActive: false });
  }

  state.projects.set(projectId, { ...newProject, isActive: true });
  state.activeProjectId = projectId;

  await saveProjectsToConfig();

  return {
    success: true,
    previousProject,
    currentProject: state.projects.get(projectId)!,
    message: `${BRAIN_PROJECT_MESSAGES.SWITCHED} "${newProject.name}"`,
  };
};

export const getProject = async (projectId: number): Promise<BrainProject | undefined> => {
  await initialize();
  return state.projects.get(projectId);
};

export const getActiveProject = async (): Promise<BrainProject | undefined> => {
  await initialize();
  return state.activeProjectId ? state.projects.get(state.activeProjectId) : undefined;
};

export const listProjects = async (): Promise<BrainProjectListResult> => {
  await initialize();

  return {
    projects: Array.from(state.projects.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    activeProjectId: state.activeProjectId ?? undefined,
    total: state.projects.size,
  };
};

export const findProjectByPath = async (rootPath: string): Promise<BrainProject | undefined> => {
  await initialize();

  return Array.from(state.projects.values()).find((p) => p.rootPath === rootPath);
};

export const updateProjectStats = async (
  projectId: number,
  stats: Partial<BrainProjectStats>
): Promise<void> => {
  await initialize();

  const project = state.projects.get(projectId);
  if (!project) return;

  const updatedProject: BrainProject = {
    ...project,
    stats: { ...project.stats, ...stats },
    updatedAt: Date.now(),
  };

  state.projects.set(projectId, updatedProject);
  await saveProjectsToConfig();
};

export const exportProject = async (projectId: number): Promise<BrainProjectExport> => {
  await initialize();

  const project = state.projects.get(projectId);
  if (!project) {
    throw new Error(BRAIN_PROJECT_MESSAGES.NOT_FOUND);
  }

  // In a real implementation, this would fetch data from Brain API
  // For now, return structure with empty data
  const exportData: BrainProjectExport = {
    project,
    concepts: [],
    memories: [],
    relationships: [],
    exportedAt: Date.now(),
    version: BRAIN_PROJECT_EXPORT_VERSION,
  };

  // Save export file
  const exportPath = join(
    homedir(),
    ".local",
    "share",
    "codetyper",
    "brain",
    "exports",
    `${project.name}-${Date.now()}${BRAIN_PROJECT_STORAGE.EXPORT_EXTENSION}`
  );

  await writeFile(exportPath, JSON.stringify(exportData, null, 2));

  return exportData;
};

export const importProject = async (
  exportData: BrainProjectExport
): Promise<BrainProjectImportResult> => {
  await initialize();

  try {
    // Create new project with imported data
    const newProject = await createProject({
      name: `${exportData.project.name} (imported)`,
      description: exportData.project.description,
      rootPath: exportData.project.rootPath,
      settings: exportData.project.settings,
    });

    // In a real implementation, this would send data to Brain API
    // For now, just return success with counts

    return {
      success: true,
      project: newProject,
      imported: {
        concepts: exportData.concepts.length,
        memories: exportData.memories.length,
        relationships: exportData.relationships.length,
      },
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      project: exportData.project,
      imported: { concepts: 0, memories: 0, relationships: 0 },
      errors: [error instanceof Error ? error.message : "Import failed"],
    };
  }
};

export const getProjectSettings = async (projectId: number): Promise<BrainProjectSettings | undefined> => {
  await initialize();

  const project = state.projects.get(projectId);
  return project?.settings;
};

export const updateProjectSettings = async (
  projectId: number,
  settings: Partial<BrainProjectSettings>
): Promise<BrainProjectSettings> => {
  const project = await updateProject(projectId, { settings });
  return project.settings;
};

export const setActiveProjectByPath = async (rootPath: string): Promise<BrainProject | undefined> => {
  const project = await findProjectByPath(rootPath);

  if (project) {
    await switchProject(project.id);
    return project;
  }

  return undefined;
};
