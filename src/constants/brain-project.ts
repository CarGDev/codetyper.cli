/**
 * Multi-project Brain constants
 */

export const BRAIN_PROJECT = {
  MAX_PROJECTS: 100,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  DEFAULT_RECALL_LIMIT: 5,
  DEFAULT_SYNC_INTERVAL: 30, // minutes
} as const;

export const BRAIN_PROJECT_STORAGE = {
  CONFIG_FILE: "brain-projects.json",
  EXPORT_EXTENSION: ".brain-export.json",
  BACKUP_EXTENSION: ".brain-backup.json",
} as const;

export const BRAIN_PROJECT_PATHS = {
  LOCAL: ".codetyper/brain",
  GLOBAL: "~/.local/share/codetyper/brain",
  EXPORTS: "~/.local/share/codetyper/brain/exports",
  BACKUPS: "~/.local/share/codetyper/brain/backups",
} as const;

export const BRAIN_PROJECT_COMMANDS = {
  LIST: "/brain projects",
  CREATE: "/brain project create",
  SWITCH: "/brain project switch",
  DELETE: "/brain project delete",
  EXPORT: "/brain project export",
  IMPORT: "/brain project import",
  SYNC: "/brain project sync",
} as const;

export const BRAIN_PROJECT_API = {
  LIST: "/api/projects",
  CREATE: "/api/projects",
  GET: "/api/projects/:id",
  UPDATE: "/api/projects/:id",
  DELETE: "/api/projects/:id",
  SWITCH: "/api/projects/:id/switch",
  EXPORT: "/api/projects/:id/export",
  IMPORT: "/api/projects/import",
  SYNC: "/api/projects/:id/sync",
} as const;

export const BRAIN_PROJECT_MESSAGES = {
  CREATED: "Brain project created successfully",
  SWITCHED: "Switched to project",
  DELETED: "Brain project deleted",
  EXPORTED: "Brain project exported",
  IMPORTED: "Brain project imported",
  SYNCED: "Brain project synced",
  NOT_FOUND: "Brain project not found",
  ALREADY_EXISTS: "Project with this name already exists",
  INVALID_NAME: "Invalid project name",
  SWITCH_FAILED: "Failed to switch project",
  EXPORT_FAILED: "Failed to export project",
  IMPORT_FAILED: "Failed to import project",
} as const;

export const BRAIN_PROJECT_DEFAULTS = {
  AUTO_LEARN: true,
  AUTO_RECALL: true,
  CONTEXT_INJECTION: true,
  SYNC_ENABLED: false,
} as const;
