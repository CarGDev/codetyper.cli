/**
 * Backup System Constants
 *
 * Configuration for the automatic file backup system.
 */

/**
 * Default backup configuration
 */
export const BACKUP_DEFAULTS = {
  /** Whether backup is enabled by default */
  ENABLED: true,
  /** Directory to store backups (relative to working dir) */
  DIRECTORY: ".codetyper-backup",
  /** Maximum number of backups to keep per file */
  MAX_BACKUPS_PER_FILE: 10,
  /** Number of days to retain backups */
  RETENTION_DAYS: 7,
  /** File extension for backups */
  EXTENSION: ".bak",
};

/**
 * Backup messages
 */
export const BACKUP_MESSAGES = {
  CREATED: (backupPath: string) => `Backup created: ${backupPath}`,
  RESTORED: (filePath: string) => `Restored from backup: ${filePath}`,
  CLEANUP: (count: number) => `Cleaned up ${count} old backup(s)`,
  NO_BACKUP: (filePath: string) => `No backup found for: ${filePath}`,
  BACKUP_FAILED: (error: string) => `Backup failed: ${error}`,
  LIST_HEADER: "Available backups:",
  NO_BACKUPS: "No backups available",
};

/**
 * Gitignore entry for backup directory
 */
export const BACKUP_GITIGNORE_ENTRY = `
# CodeTyper backup files
.codetyper-backup/
`;
