/**
 * Snapshot Service - Git-based differential snapshots
 *
 * Provides:
 * - Git-based differential snapshots
 * - Automatic 7-day retention pruning
 * - Patch generation and validation
 * - FileDiff tracking (additions, deletions, files changed)
 */

import { execSync, exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const SNAPSHOTS_DIR = ".codetyper/snapshots";
const RETENTION_DAYS = 7;
const SNAPSHOT_BRANCH_PREFIX = "codetyper-snapshot-";

export interface FileDiff {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  oldPath?: string; // For renamed files
}

export interface Snapshot {
  id: string;
  timestamp: number;
  message: string;
  commitHash: string;
  parentHash: string | null;
  files: FileDiff[];
  stats: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
}

export interface SnapshotMetadata {
  id: string;
  timestamp: number;
  message: string;
  commitHash: string;
}

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const isGitRepository = async (workingDir: string): Promise<boolean> => {
  return fileExists(path.join(workingDir, ".git"));
};

const runGitCommand = (
  command: string,
  cwd: string,
): { success: boolean; output: string; error?: string } => {
  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output: output.trim() };
  } catch (err) {
    const error = err as { stderr?: string; message?: string };
    return {
      success: false,
      output: "",
      error: error.stderr ?? error.message ?? "Unknown error",
    };
  }
};

const runGitCommandAsync = (
  command: string,
  cwd: string,
): Promise<{ success: boolean; output: string; error?: string }> => {
  return new Promise((resolve) => {
    exec(command, { cwd, encoding: "utf-8" }, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, output: "", error: stderr || err.message });
      } else {
        resolve({ success: true, output: stdout.trim() });
      }
    });
  });
};

const ensureSnapshotsDir = async (workingDir: string): Promise<void> => {
  const snapshotsDir = path.join(workingDir, SNAPSHOTS_DIR);
  await fs.mkdir(snapshotsDir, { recursive: true });
};

const parseGitDiff = (diffOutput: string): FileDiff[] => {
  const files: FileDiff[] = [];
  const lines = diffOutput.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    // Format: 1	2	path or A	-	path (for additions)
    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (match) {
      const additions = match[1] === "-" ? 0 : parseInt(match[1], 10);
      const deletions = match[2] === "-" ? 0 : parseInt(match[2], 10);
      const filePath = match[3];

      // Check for rename (old => new)
      const renameMatch = filePath.match(/^(.+) => (.+)$/);
      if (renameMatch) {
        files.push({
          path: renameMatch[2],
          oldPath: renameMatch[1],
          status: "renamed",
          additions,
          deletions,
        });
      } else {
        // Determine status based on additions/deletions
        let status: FileDiff["status"] = "modified";
        if (additions > 0 && deletions === 0) {
          status = "added";
        } else if (deletions > 0 && additions === 0) {
          status = "deleted";
        }

        files.push({
          path: filePath,
          status,
          additions,
          deletions,
        });
      }
    }
  }

  return files;
};

const getCommitDiff = (
  workingDir: string,
  commitHash: string,
  parentHash: string | null,
): FileDiff[] => {
  const compareTarget = parentHash ?? `${commitHash}^`;
  const result = runGitCommand(
    `git diff --numstat ${compareTarget} ${commitHash}`,
    workingDir,
  );

  if (!result.success || !result.output) {
    return [];
  }

  return parseGitDiff(result.output);
};

const getCurrentCommitHash = (workingDir: string): string | null => {
  const result = runGitCommand("git rev-parse HEAD", workingDir);
  return result.success ? result.output : null;
};

/** Get the most recent commit message */
export const getHeadCommitMessage = (workingDir: string): string => {
  const result = runGitCommand("git log -1 --format=%s", workingDir);
  return result.success ? result.output : "No message";
};

export const createSnapshot = async (
  workingDir: string,
  message?: string,
): Promise<Snapshot | null> => {
  if (!(await isGitRepository(workingDir))) {
    return null;
  }

  await ensureSnapshotsDir(workingDir);

  const id = uuidv4();
  const timestamp = Date.now();
  const snapshotMessage =
    message ?? `Snapshot ${new Date(timestamp).toISOString()}`;

  // Get current state
  const currentCommit = getCurrentCommitHash(workingDir);
  if (!currentCommit) {
    return null;
  }

  // Check if there are uncommitted changes
  const statusResult = runGitCommand("git status --porcelain", workingDir);
  const hasChanges = statusResult.success && statusResult.output.length > 0;

  let snapshotCommit = currentCommit;
  let parentHash: string | null = null;

  if (hasChanges) {
    // Stash current changes, create snapshot, then restore
    const stashResult = runGitCommand(
      `git stash push -m "codetyper-temp-${id}"`,
      workingDir,
    );

    if (!stashResult.success) {
      return null;
    }

    // Get the parent commit (before stash)
    parentHash = getCurrentCommitHash(workingDir);
  } else {
    // Get parent of current commit
    const parentResult = runGitCommand("git rev-parse HEAD^", workingDir);
    parentHash = parentResult.success ? parentResult.output : null;
  }

  // Calculate diff
  const files = getCommitDiff(workingDir, snapshotCommit, parentHash);
  const stats = {
    filesChanged: files.length,
    additions: files.reduce((sum, f) => sum + f.additions, 0),
    deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };

  // Restore stashed changes if any
  if (hasChanges) {
    runGitCommand("git stash pop", workingDir);
  }

  // Save snapshot metadata
  const snapshot: Snapshot = {
    id,
    timestamp,
    message: snapshotMessage,
    commitHash: snapshotCommit,
    parentHash,
    files,
    stats,
  };

  const snapshotPath = path.join(workingDir, SNAPSHOTS_DIR, `${id}.json`);
  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

  return snapshot;
};

export const getSnapshot = async (
  workingDir: string,
  snapshotId: string,
): Promise<Snapshot | null> => {
  const snapshotPath = path.join(
    workingDir,
    SNAPSHOTS_DIR,
    `${snapshotId}.json`,
  );

  try {
    const content = await fs.readFile(snapshotPath, "utf-8");
    return JSON.parse(content) as Snapshot;
  } catch {
    return null;
  }
};

export const listSnapshots = async (
  workingDir: string,
): Promise<SnapshotMetadata[]> => {
  const snapshotsDir = path.join(workingDir, SNAPSHOTS_DIR);

  if (!(await fileExists(snapshotsDir))) {
    return [];
  }

  try {
    const files = await fs.readdir(snapshotsDir);
    const snapshots: SnapshotMetadata[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const content = await fs.readFile(
          path.join(snapshotsDir, file),
          "utf-8",
        );
        const snapshot = JSON.parse(content) as Snapshot;
        snapshots.push({
          id: snapshot.id,
          timestamp: snapshot.timestamp,
          message: snapshot.message,
          commitHash: snapshot.commitHash,
        });
      } catch {
        // Skip invalid snapshot files
      }
    }

    // Sort by timestamp descending (newest first)
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

export const deleteSnapshot = async (
  workingDir: string,
  snapshotId: string,
): Promise<boolean> => {
  const snapshotPath = path.join(
    workingDir,
    SNAPSHOTS_DIR,
    `${snapshotId}.json`,
  );

  try {
    await fs.unlink(snapshotPath);
    return true;
  } catch {
    return false;
  }
};

export const pruneOldSnapshots = async (
  workingDir: string,
): Promise<number> => {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const snapshots = await listSnapshots(workingDir);
  let deleted = 0;

  for (const snapshot of snapshots) {
    if (snapshot.timestamp < cutoff) {
      if (await deleteSnapshot(workingDir, snapshot.id)) {
        deleted++;
      }
    }
  }

  return deleted;
};

export const generatePatch = async (
  workingDir: string,
  snapshotId: string,
): Promise<string | null> => {
  const snapshot = await getSnapshot(workingDir, snapshotId);
  if (!snapshot) {
    return null;
  }

  const compareTarget = snapshot.parentHash ?? `${snapshot.commitHash}^`;
  const result = runGitCommand(
    `git diff ${compareTarget} ${snapshot.commitHash}`,
    workingDir,
  );

  return result.success ? result.output : null;
};

export const validatePatch = async (
  workingDir: string,
  patch: string,
): Promise<{ valid: boolean; errors: string[] }> => {
  // Write patch to temp file
  const tempPatchPath = path.join(
    workingDir,
    SNAPSHOTS_DIR,
    `temp-${Date.now()}.patch`,
  );

  try {
    await fs.writeFile(tempPatchPath, patch);

    // Try to apply patch with --check (dry run)
    const result = await runGitCommandAsync(
      `git apply --check "${tempPatchPath}"`,
      workingDir,
    );

    return {
      valid: result.success,
      errors: result.error ? [result.error] : [],
    };
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPatchPath);
    } catch {
      // Ignore cleanup errors
    }
  }
};

export const restoreSnapshot = async (
  workingDir: string,
  snapshotId: string,
): Promise<{ success: boolean; error?: string }> => {
  const snapshot = await getSnapshot(workingDir, snapshotId);
  if (!snapshot) {
    return { success: false, error: "Snapshot not found" };
  }

  // Check if commit exists
  const result = runGitCommand(
    `git cat-file -t ${snapshot.commitHash}`,
    workingDir,
  );

  if (!result.success) {
    return { success: false, error: "Snapshot commit no longer exists" };
  }

  // Create a new branch from the snapshot
  const branchName = `${SNAPSHOT_BRANCH_PREFIX}${snapshotId.slice(0, 8)}`;
  const branchResult = runGitCommand(
    `git checkout -b ${branchName} ${snapshot.commitHash}`,
    workingDir,
  );

  if (!branchResult.success) {
    return { success: false, error: branchResult.error };
  }

  return { success: true };
};

export const getWorkingDirectoryDiff = async (
  workingDir: string,
): Promise<FileDiff[]> => {
  if (!(await isGitRepository(workingDir))) {
    return [];
  }

  // Get diff between HEAD and working directory
  const stagedResult = runGitCommand("git diff --numstat --cached", workingDir);
  const unstagedResult = runGitCommand("git diff --numstat", workingDir);

  const files: FileDiff[] = [];

  if (stagedResult.success && stagedResult.output) {
    files.push(...parseGitDiff(stagedResult.output));
  }

  if (unstagedResult.success && unstagedResult.output) {
    const unstagedFiles = parseGitDiff(unstagedResult.output);
    // Merge with staged, preferring staged status
    for (const file of unstagedFiles) {
      if (!files.some((f) => f.path === file.path)) {
        files.push(file);
      }
    }
  }

  return files;
};

export const snapshotService = {
  createSnapshot,
  getSnapshot,
  listSnapshots,
  deleteSnapshot,
  pruneOldSnapshots,
  generatePatch,
  validatePatch,
  restoreSnapshot,
  getWorkingDirectoryDiff,
  isGitRepository,
};
