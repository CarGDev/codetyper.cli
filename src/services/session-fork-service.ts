/**
 * Session Fork Service
 *
 * Manages session snapshots, forks, and rewind functionality
 */

import { readFile, writeFile, mkdir, access, constants } from "fs/promises";
import { join, dirname } from "path";
import { v4 as uuidv4 } from "uuid";
import type {
  SessionSnapshot,
  SessionSnapshotState,
  SessionFork,
  SessionForkFile,
  SnapshotCreateResult,
  RewindResult,
  ForkCreateResult,
  ForkSwitchResult,
  ForkSummary,
  SnapshotSummary,
  SnapshotOptions,
  ForkOptions,
  SessionMessage,
} from "@/types/session-fork";
import type { TodoItem } from "@/types/todo";
import {
  FORK_FILE_EXTENSION,
  MAIN_FORK_NAME,
  DEFAULT_SNAPSHOT_PREFIX,
  MAX_SNAPSHOTS_PER_FORK,
  MAX_FORKS_PER_SESSION,
  FORK_FILE_VERSION,
  FORKS_SUBDIR,
  COMMIT_MESSAGE_TEMPLATES,
  COMMIT_TYPE_KEYWORDS,
  FORK_ERRORS,
} from "@constants/session-fork";
import { LOCAL_CONFIG_DIR } from "@constants/paths";

/**
 * In-memory state for current session
 */
interface SessionForkState {
  sessionId: string | null;
  file: SessionForkFile | null;
  filePath: string | null;
  dirty: boolean;
}

const state: SessionForkState = {
  sessionId: null,
  file: null,
  filePath: null,
  dirty: false,
};

/**
 * Generate suggested commit message from messages
 */
const generateCommitMessage = (messages: SessionMessage[]): string => {
  const userMessages = messages.filter((m) => m.role === "user");
  const count = messages.length;

  if (userMessages.length === 0) {
    return COMMIT_MESSAGE_TEMPLATES.DEFAULT.replace(
      "{summary}",
      "session checkpoint",
    ).replace("{count}", String(count));
  }

  // Get first user message as summary base
  const firstMessage = userMessages[0]?.content || "";
  const summary = firstMessage.slice(0, 50).replace(/\n/g, " ").trim();

  // Detect commit type from messages
  const allContent = userMessages.map((m) => m.content.toLowerCase()).join(" ");

  for (const [type, keywords] of Object.entries(COMMIT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (allContent.includes(keyword)) {
        const template =
          COMMIT_MESSAGE_TEMPLATES[
            type as keyof typeof COMMIT_MESSAGE_TEMPLATES
          ];
        return template
          .replace("{summary}", summary || keyword)
          .replace("{count}", String(count));
      }
    }
  }

  return COMMIT_MESSAGE_TEMPLATES.DEFAULT.replace(
    "{summary}",
    summary || "session changes",
  ).replace("{count}", String(count));
};

/**
 * Get fork file path for a session
 */
const getForkFilePath = (sessionId: string, workingDir: string): string => {
  const localPath = join(workingDir, LOCAL_CONFIG_DIR, FORKS_SUBDIR);
  return join(localPath, `${sessionId}${FORK_FILE_EXTENSION}`);
};

/**
 * Create empty fork file
 */
const createEmptyForkFile = (sessionId: string): SessionForkFile => {
  const mainFork: SessionFork = {
    id: uuidv4(),
    name: MAIN_FORK_NAME,
    snapshots: [],
    currentSnapshotId: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return {
    version: FORK_FILE_VERSION,
    sessionId,
    forks: [mainFork],
    currentForkId: mainFork.id,
  };
};

/**
 * Load fork file for a session
 */
const loadForkFile = async (
  sessionId: string,
  workingDir: string,
): Promise<SessionForkFile> => {
  const filePath = getForkFilePath(sessionId, workingDir);

  try {
    await access(filePath, constants.R_OK);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as SessionForkFile;
  } catch {
    return createEmptyForkFile(sessionId);
  }
};

/**
 * Save fork file
 */
const saveForkFile = async (
  file: SessionForkFile,
  filePath: string,
): Promise<void> => {
  const dir = dirname(filePath);

  try {
    await access(dir, constants.W_OK);
  } catch {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(filePath, JSON.stringify(file, null, 2), "utf-8");
};

/**
 * Initialize fork service for a session
 */
export const initializeForkService = async (
  sessionId: string,
  workingDir: string,
): Promise<void> => {
  const filePath = getForkFilePath(sessionId, workingDir);
  const file = await loadForkFile(sessionId, workingDir);

  state.sessionId = sessionId;
  state.file = file;
  state.filePath = filePath;
  state.dirty = false;
};

/**
 * Get current fork
 */
const getCurrentFork = (): SessionFork | null => {
  if (!state.file) return null;
  return (
    state.file.forks.find((f) => f.id === state.file?.currentForkId) || null
  );
};

/**
 * Create a snapshot
 */
export const createSnapshot = async (
  messages: SessionMessage[],
  todoItems: TodoItem[],
  contextFiles: string[],
  metadata: {
    provider: string;
    model: string;
    agent: string;
    workingDir: string;
  },
  options: SnapshotOptions = {},
): Promise<SnapshotCreateResult> => {
  if (!state.file || !state.filePath) {
    return { success: false, error: FORK_ERRORS.SESSION_NOT_FOUND };
  }

  const fork = getCurrentFork();
  if (!fork) {
    return { success: false, error: FORK_ERRORS.FORK_NOT_FOUND };
  }

  if (fork.snapshots.length >= MAX_SNAPSHOTS_PER_FORK) {
    return { success: false, error: FORK_ERRORS.MAX_SNAPSHOTS_REACHED };
  }

  // Generate snapshot name
  const name =
    options.name || `${DEFAULT_SNAPSHOT_PREFIX}-${fork.snapshots.length + 1}`;

  // Check for duplicate name
  if (fork.snapshots.some((s) => s.name === name)) {
    return { success: false, error: FORK_ERRORS.DUPLICATE_SNAPSHOT_NAME };
  }

  const snapshotState: SessionSnapshotState = {
    messages: [...messages],
    todoItems: options.includeTodos !== false ? [...todoItems] : [],
    contextFiles:
      options.includeContextFiles !== false ? [...contextFiles] : [],
    metadata,
  };

  const snapshot: SessionSnapshot = {
    id: uuidv4(),
    name,
    timestamp: Date.now(),
    parentId: fork.currentSnapshotId || null,
    state: snapshotState,
    suggestedCommitMessage: generateCommitMessage(messages),
  };

  fork.snapshots.push(snapshot);
  fork.currentSnapshotId = snapshot.id;
  fork.updatedAt = Date.now();

  state.dirty = true;
  await saveForkFile(state.file, state.filePath);

  return { success: true, snapshot };
};

/**
 * Rewind to a snapshot
 */
export const rewindToSnapshot = async (
  target: string | number,
): Promise<RewindResult> => {
  if (!state.file || !state.filePath) {
    return {
      success: false,
      messagesRestored: 0,
      error: FORK_ERRORS.SESSION_NOT_FOUND,
    };
  }

  const fork = getCurrentFork();
  if (!fork) {
    return {
      success: false,
      messagesRestored: 0,
      error: FORK_ERRORS.FORK_NOT_FOUND,
    };
  }

  if (fork.snapshots.length === 0) {
    return {
      success: false,
      messagesRestored: 0,
      error: FORK_ERRORS.NO_SNAPSHOTS_TO_REWIND,
    };
  }

  let snapshot: SessionSnapshot | undefined;

  if (typeof target === "number") {
    // Rewind by count (e.g., 1 = previous snapshot)
    const currentIndex = fork.snapshots.findIndex(
      (s) => s.id === fork.currentSnapshotId,
    );
    const targetIndex = currentIndex - target;

    if (targetIndex < 0) {
      snapshot = fork.snapshots[0];
    } else {
      snapshot = fork.snapshots[targetIndex];
    }
  } else {
    // Rewind by name
    snapshot = fork.snapshots.find((s) => s.name === target || s.id === target);
  }

  if (!snapshot) {
    return {
      success: false,
      messagesRestored: 0,
      error: FORK_ERRORS.SNAPSHOT_NOT_FOUND,
    };
  }

  fork.currentSnapshotId = snapshot.id;
  fork.updatedAt = Date.now();

  state.dirty = true;
  await saveForkFile(state.file, state.filePath);

  return {
    success: true,
    snapshot,
    messagesRestored: snapshot.state.messages.length,
  };
};

/**
 * Create a new fork
 */
export const createFork = async (
  options: ForkOptions = {},
): Promise<ForkCreateResult> => {
  if (!state.file || !state.filePath) {
    return { success: false, error: FORK_ERRORS.SESSION_NOT_FOUND };
  }

  if (state.file.forks.length >= MAX_FORKS_PER_SESSION) {
    return { success: false, error: FORK_ERRORS.MAX_FORKS_REACHED };
  }

  const currentFork = getCurrentFork();
  if (!currentFork) {
    return { success: false, error: FORK_ERRORS.FORK_NOT_FOUND };
  }

  // Generate fork name
  const name = options.name || `fork-${state.file.forks.length + 1}`;

  // Check for duplicate name
  if (state.file.forks.some((f) => f.name === name)) {
    return { success: false, error: FORK_ERRORS.DUPLICATE_FORK_NAME };
  }

  // Determine which snapshot to branch from
  let branchFromId = currentFork.currentSnapshotId;
  if (options.fromSnapshot) {
    const snapshot = currentFork.snapshots.find(
      (s) => s.name === options.fromSnapshot || s.id === options.fromSnapshot,
    );
    if (!snapshot) {
      return { success: false, error: FORK_ERRORS.SNAPSHOT_NOT_FOUND };
    }
    branchFromId = snapshot.id;
  }

  // Copy snapshots up to branch point
  const branchIndex = currentFork.snapshots.findIndex(
    (s) => s.id === branchFromId,
  );
  const copiedSnapshots = currentFork.snapshots
    .slice(0, branchIndex + 1)
    .map((s) => ({
      ...s,
      id: uuidv4(), // New IDs for copied snapshots
    }));

  const newFork: SessionFork = {
    id: uuidv4(),
    name,
    snapshots: copiedSnapshots,
    currentSnapshotId: copiedSnapshots[copiedSnapshots.length - 1]?.id || "",
    parentForkId: currentFork.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  state.file.forks.push(newFork);
  state.file.currentForkId = newFork.id;

  state.dirty = true;
  await saveForkFile(state.file, state.filePath);

  return { success: true, fork: newFork };
};

/**
 * Switch to a different fork
 */
export const switchFork = async (name: string): Promise<ForkSwitchResult> => {
  if (!state.file || !state.filePath) {
    return { success: false, error: FORK_ERRORS.SESSION_NOT_FOUND };
  }

  const fork = state.file.forks.find((f) => f.name === name || f.id === name);
  if (!fork) {
    return { success: false, error: FORK_ERRORS.FORK_NOT_FOUND };
  }

  state.file.currentForkId = fork.id;

  state.dirty = true;
  await saveForkFile(state.file, state.filePath);

  return { success: true, fork };
};

/**
 * List all forks
 */
export const listForks = (): ForkSummary[] => {
  if (!state.file) return [];

  return state.file.forks.map((fork) => {
    const currentSnapshot = fork.snapshots.find(
      (s) => s.id === fork.currentSnapshotId,
    );

    return {
      id: fork.id,
      name: fork.name,
      snapshotCount: fork.snapshots.length,
      currentSnapshotName: currentSnapshot?.name || "(no snapshots)",
      createdAt: fork.createdAt,
      updatedAt: fork.updatedAt,
      isCurrent: fork.id === state.file?.currentForkId,
    };
  });
};

/**
 * List snapshots in current fork
 */
export const listSnapshots = (): SnapshotSummary[] => {
  const fork = getCurrentFork();
  if (!fork) return [];

  return fork.snapshots.map((snapshot) => ({
    id: snapshot.id,
    name: snapshot.name,
    timestamp: snapshot.timestamp,
    messageCount: snapshot.state.messages.length,
    isCurrent: snapshot.id === fork.currentSnapshotId,
    suggestedCommitMessage: snapshot.suggestedCommitMessage,
  }));
};

/**
 * Get current snapshot
 */
export const getCurrentSnapshot = (): SessionSnapshot | null => {
  const fork = getCurrentFork();
  if (!fork) return null;

  return fork.snapshots.find((s) => s.id === fork.currentSnapshotId) || null;
};

/**
 * Get snapshot by name or ID
 */
export const getSnapshot = (nameOrId: string): SessionSnapshot | null => {
  const fork = getCurrentFork();
  if (!fork) return null;

  return (
    fork.snapshots.find((s) => s.name === nameOrId || s.id === nameOrId) || null
  );
};

/**
 * Check if fork service is initialized
 */
export const isForkServiceInitialized = (): boolean => {
  return state.file !== null && state.sessionId !== null;
};

/**
 * Get current session ID
 */
export const getCurrentSessionId = (): string | null => {
  return state.sessionId;
};

/**
 * Clear fork service state
 */
export const clearForkService = (): void => {
  state.sessionId = null;
  state.file = null;
  state.filePath = null;
  state.dirty = false;
};
