/**
 * Session Fork Type Definitions
 *
 * Types for session snapshots, forks, and rewind functionality
 */

import type { TodoItem } from "@/types/todo";

/**
 * A snapshot of session state at a point in time
 */
export interface SessionSnapshot {
  /** Unique snapshot ID */
  id: string;
  /** User-friendly name for the snapshot */
  name: string;
  /** Timestamp when snapshot was created */
  timestamp: number;
  /** Parent snapshot ID (null for root) */
  parentId: string | null;
  /** Session state at this point */
  state: SessionSnapshotState;
  /** Suggested commit message based on changes */
  suggestedCommitMessage?: string;
}

/**
 * State captured in a snapshot
 */
export interface SessionSnapshotState {
  /** Message history */
  messages: SessionMessage[];
  /** Todo items */
  todoItems: TodoItem[];
  /** Files in context */
  contextFiles: string[];
  /** Metadata */
  metadata: SessionSnapshotMetadata;
}

/**
 * Message in session history
 */
export interface SessionMessage {
  /** Message role */
  role: "user" | "assistant" | "system" | "tool";
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Tool call ID if tool message */
  toolCallId?: string;
  /** Tool name if tool message */
  toolName?: string;
}

/**
 * Metadata for a snapshot
 */
export interface SessionSnapshotMetadata {
  /** Provider used */
  provider: string;
  /** Model used */
  model: string;
  /** Agent type */
  agent: string;
  /** Working directory */
  workingDir: string;
  /** Total tokens used up to this point */
  totalTokens?: number;
}

/**
 * A session fork (branch of snapshots)
 */
export interface SessionFork {
  /** Unique fork ID */
  id: string;
  /** User-friendly name for the fork */
  name: string;
  /** All snapshots in this fork */
  snapshots: SessionSnapshot[];
  /** Current snapshot ID */
  currentSnapshotId: string;
  /** Parent fork ID if branched from another fork */
  parentForkId?: string;
  /** Timestamp when fork was created */
  createdAt: number;
  /** Timestamp of last update */
  updatedAt: number;
}

/**
 * Session fork storage file structure
 */
export interface SessionForkFile {
  /** Version for migration support */
  version: number;
  /** Session ID */
  sessionId: string;
  /** All forks */
  forks: SessionFork[];
  /** Current fork ID */
  currentForkId: string;
}

/**
 * Result of creating a snapshot
 */
export interface SnapshotCreateResult {
  success: boolean;
  snapshot?: SessionSnapshot;
  error?: string;
}

/**
 * Result of rewinding to a snapshot
 */
export interface RewindResult {
  success: boolean;
  snapshot?: SessionSnapshot;
  messagesRestored: number;
  error?: string;
}

/**
 * Result of creating a fork
 */
export interface ForkCreateResult {
  success: boolean;
  fork?: SessionFork;
  error?: string;
}

/**
 * Result of switching forks
 */
export interface ForkSwitchResult {
  success: boolean;
  fork?: SessionFork;
  error?: string;
}

/**
 * Fork summary for listing
 */
export interface ForkSummary {
  id: string;
  name: string;
  snapshotCount: number;
  currentSnapshotName: string;
  createdAt: number;
  updatedAt: number;
  isCurrent: boolean;
}

/**
 * Snapshot summary for listing
 */
export interface SnapshotSummary {
  id: string;
  name: string;
  timestamp: number;
  messageCount: number;
  isCurrent: boolean;
  suggestedCommitMessage?: string;
}

/**
 * Options for snapshot creation
 */
export interface SnapshotOptions {
  /** Custom name for the snapshot */
  name?: string;
  /** Include todos in snapshot */
  includeTodos?: boolean;
  /** Include context files in snapshot */
  includeContextFiles?: boolean;
}

/**
 * Options for fork creation
 */
export interface ForkOptions {
  /** Custom name for the fork */
  name?: string;
  /** Snapshot to branch from (defaults to current) */
  fromSnapshot?: string;
}
