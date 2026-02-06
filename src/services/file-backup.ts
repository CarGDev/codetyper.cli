/**
 * File Backup Service
 *
 * Automatically creates backups of files before write/edit operations.
 * Provides rollback functionality to restore previous versions.
 */

import fs from "fs/promises";
import path from "path";
import { BACKUP_DEFAULTS, BACKUP_MESSAGES } from "@constants/backup";

/**
 * Backup metadata
 */
export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  timestamp: number;
  formattedTime: string;
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  enabled: boolean;
  directory: string;
  maxBackupsPerFile: number;
  retentionDays: number;
}

/**
 * Get backup configuration (could be loaded from config in the future)
 */
export const getBackupConfig = (): BackupConfig => ({
  enabled: BACKUP_DEFAULTS.ENABLED,
  directory: BACKUP_DEFAULTS.DIRECTORY,
  maxBackupsPerFile: BACKUP_DEFAULTS.MAX_BACKUPS_PER_FILE,
  retentionDays: BACKUP_DEFAULTS.RETENTION_DAYS,
});

/**
 * Generate a backup filename with timestamp
 */
const generateBackupFilename = (originalFilename: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${originalFilename}.${timestamp}${BACKUP_DEFAULTS.EXTENSION}`;
};

/**
 * Get the backup directory for a file
 */
const getBackupDir = (
  filePath: string,
  workingDir: string,
  config: BackupConfig,
): string => {
  // Preserve directory structure in backup
  const relativePath = path.relative(workingDir, path.dirname(filePath));
  return path.join(workingDir, config.directory, relativePath);
};

/**
 * Create a backup of a file before modification
 * Returns the backup path if successful, null if file doesn't exist or backup failed
 */
export const createBackup = async (
  filePath: string,
  workingDir: string,
): Promise<string | null> => {
  const config = getBackupConfig();

  if (!config.enabled) {
    return null;
  }

  try {
    // Check if file exists
    await fs.access(filePath);

    // Read original content
    const content = await fs.readFile(filePath, "utf-8");

    // Create backup directory
    const backupDir = getBackupDir(filePath, workingDir, config);
    await fs.mkdir(backupDir, { recursive: true });

    // Generate backup filename
    const originalFilename = path.basename(filePath);
    const backupFilename = generateBackupFilename(originalFilename);
    const backupPath = path.join(backupDir, backupFilename);

    // Write backup
    await fs.writeFile(backupPath, content, "utf-8");

    // Cleanup old backups
    await cleanupOldBackups(filePath, workingDir, config);

    return backupPath;
  } catch {
    // File doesn't exist or backup failed - not critical
    return null;
  }
};

/**
 * Get list of backups for a file
 */
export const listBackups = async (
  filePath: string,
  workingDir: string,
): Promise<BackupInfo[]> => {
  const config = getBackupConfig();
  const backupDir = getBackupDir(filePath, workingDir, config);
  const originalFilename = path.basename(filePath);

  try {
    const files = await fs.readdir(backupDir);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      if (file.startsWith(originalFilename) && file.endsWith(BACKUP_DEFAULTS.EXTENSION)) {
        const backupPath = path.join(backupDir, file);
        const stats = await fs.stat(backupPath);

        backups.push({
          originalPath: filePath,
          backupPath,
          timestamp: stats.mtime.getTime(),
          formattedTime: stats.mtime.toLocaleString(),
        });
      }
    }

    // Sort by timestamp, newest first
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

/**
 * Get the most recent backup for a file
 */
export const getLatestBackup = async (
  filePath: string,
  workingDir: string,
): Promise<BackupInfo | null> => {
  const backups = await listBackups(filePath, workingDir);
  return backups[0] ?? null;
};

/**
 * Restore a file from backup
 */
export const restoreFromBackup = async (
  backupPath: string,
  targetPath: string,
): Promise<boolean> => {
  try {
    const content = await fs.readFile(backupPath, "utf-8");
    await fs.writeFile(targetPath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
};

/**
 * Restore a file from its most recent backup
 */
export const restoreLatestBackup = async (
  filePath: string,
  workingDir: string,
): Promise<{ success: boolean; message: string }> => {
  const backup = await getLatestBackup(filePath, workingDir);

  if (!backup) {
    return {
      success: false,
      message: BACKUP_MESSAGES.NO_BACKUP(filePath),
    };
  }

  const restored = await restoreFromBackup(backup.backupPath, filePath);

  if (restored) {
    return {
      success: true,
      message: BACKUP_MESSAGES.RESTORED(filePath),
    };
  }

  return {
    success: false,
    message: BACKUP_MESSAGES.BACKUP_FAILED("Could not restore from backup"),
  };
};

/**
 * Clean up old backups for a file
 */
const cleanupOldBackups = async (
  filePath: string,
  workingDir: string,
  config: BackupConfig,
): Promise<number> => {
  const backups = await listBackups(filePath, workingDir);
  let cleanedUp = 0;

  const cutoffTime = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;

  for (let i = 0; i < backups.length; i++) {
    const backup = backups[i];
    const shouldDelete =
      // Exceeds max backups
      i >= config.maxBackupsPerFile ||
      // Exceeds retention period
      backup.timestamp < cutoffTime;

    if (shouldDelete) {
      try {
        await fs.unlink(backup.backupPath);
        cleanedUp++;
      } catch {
        // Ignore deletion errors
      }
    }
  }

  return cleanedUp;
};

/**
 * Format backup list for display
 */
export const formatBackupList = (backups: BackupInfo[]): string => {
  if (backups.length === 0) {
    return BACKUP_MESSAGES.NO_BACKUPS;
  }

  const lines = [BACKUP_MESSAGES.LIST_HEADER];

  for (const backup of backups) {
    const relativePath = path.basename(backup.backupPath);
    lines.push(`  ${backup.formattedTime} - ${relativePath}`);
  }

  return lines.join("\n");
};
