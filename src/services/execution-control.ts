/**
 * Execution Control Service
 *
 * Provides pause/resume, step-by-step mode, and abort with rollback
 * for agent execution. Based on GitHub issue #113.
 */

import { writeFile, unlink, readFile } from "fs/promises";
import type {
  ExecutionControl,
  ExecutionControlState,
  ExecutionControlEvents,
  ExecutionState,
  RollbackAction,
} from "@/types/execution-control";
import { createExecutionControlState } from "@/types/execution-control";

/**
 * Create an execution control instance
 */
export const createExecutionControl = (
  events: ExecutionControlEvents = {},
): ExecutionControl & {
  /** Internal: record an action for potential rollback */
  recordAction: (action: Omit<RollbackAction, "id" | "timestamp">) => void;
  /** Internal: wait for resume if paused */
  waitIfPaused: () => Promise<void>;
  /** Internal: wait for step confirmation if in step mode */
  waitForStep: (toolName: string, toolArgs: Record<string, unknown>) => Promise<void>;
  /** Internal: get the full state */
  getFullState: () => ExecutionControlState;
} => {
  const state: ExecutionControlState = createExecutionControlState();

  /**
   * Wait for resume if paused
   */
  const waitIfPaused = async (): Promise<void> => {
    if (state.state !== "paused") return;

    return new Promise<void>((resolve) => {
      state.resumeResolver = resolve;
    });
  };

  /**
   * Wait for step confirmation in step mode
   */
  const waitForStep = async (
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): Promise<void> => {
    if (!state.stepModeEnabled || state.state === "aborted") return;

    state.waitingForStep = true;
    events.onWaitingForStep?.(toolName, toolArgs);

    return new Promise<void>((resolve) => {
      state.stepResolver = resolve;
    });
  };

  /**
   * Record an action for potential rollback
   */
  const recordAction = (
    action: Omit<RollbackAction, "id" | "timestamp">,
  ): void => {
    const fullAction: RollbackAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };
    state.rollbackStack.push(fullAction);
  };

  /**
   * Perform rollback of recorded actions
   */
  const performRollback = async (): Promise<number> => {
    let rolledBack = 0;

    // Process in reverse order (LIFO)
    while (state.rollbackStack.length > 0) {
      const action = state.rollbackStack.pop();
      if (!action) continue;

      try {
        await rollbackAction(action);
        events.onRollback?.(action);
        rolledBack++;
      } catch (error) {
        // Log but continue with other rollbacks
        console.error(`Rollback failed for ${action.id}:`, error);
      }
    }

    events.onRollbackComplete?.(rolledBack);
    return rolledBack;
  };

  /**
   * Rollback a single action
   */
  const rollbackAction = async (action: RollbackAction): Promise<void> => {
    const handlers: Record<RollbackAction["type"], () => Promise<void>> = {
      file_write: async () => {
        // Delete the created file
        if (action.originalState?.filePath) {
          await unlink(action.originalState.filePath).catch(() => {});
        }
      },

      file_edit: async () => {
        // Restore original content
        if (action.originalState?.filePath && action.originalState?.content) {
          await writeFile(
            action.originalState.filePath,
            action.originalState.content,
            "utf-8",
          );
        }
      },

      file_delete: async () => {
        // Restore deleted file
        if (action.originalState?.filePath && action.originalState?.content) {
          await writeFile(
            action.originalState.filePath,
            action.originalState.content,
            "utf-8",
          );
        }
      },

      bash_command: async () => {
        // Bash commands cannot be reliably rolled back
        // Just log the action that was performed
      },
    };

    const handler = handlers[action.type];
    if (handler) {
      await handler();
    }
  };

  return {
    pause: (): void => {
      if (state.state === "running" || state.state === "stepping") {
        state.state = "paused";
        events.onPause?.();
      }
    },

    resume: (): void => {
      if (state.state === "paused") {
        state.state = state.stepModeEnabled ? "stepping" : "running";
        events.onResume?.();

        // Resolve any pending pause wait
        if (state.resumeResolver) {
          state.resumeResolver();
          state.resumeResolver = null;
        }
      }
    },

    abort: async (rollback = false): Promise<void> => {
      state.state = "aborted";

      // Resolve any pending waits
      if (state.resumeResolver) {
        state.resumeResolver();
        state.resumeResolver = null;
      }
      if (state.stepResolver) {
        state.stepResolver();
        state.stepResolver = null;
      }

      const rollbackCount = rollback ? state.rollbackStack.length : 0;
      events.onAbort?.(rollbackCount);

      if (rollback && state.rollbackStack.length > 0) {
        await performRollback();
      }

      state.rollbackStack = [];
    },

    stepMode: (enabled: boolean): void => {
      state.stepModeEnabled = enabled;
      if (enabled) {
        state.state = "stepping";
        events.onStepModeEnabled?.();
      } else {
        if (state.state === "stepping") {
          state.state = "running";
        }
        events.onStepModeDisabled?.();
      }
    },

    step: (): void => {
      if (state.waitingForStep && state.stepResolver) {
        state.waitingForStep = false;
        state.stepResolver();
        state.stepResolver = null;
      }
    },

    getState: (): ExecutionState => state.state,

    getRollbackActions: (): RollbackAction[] => [...state.rollbackStack],

    isWaitingForStep: (): boolean => state.waitingForStep,

    // Internal methods
    recordAction,
    waitIfPaused,
    waitForStep,
    getFullState: () => ({ ...state }),
  };
};

/**
 * Helper to capture file state before modification
 */
export const captureFileState = async (
  filePath: string,
): Promise<{ filePath: string; content: string } | null> => {
  try {
    const content = await readFile(filePath, "utf-8");
    return { filePath, content };
  } catch {
    // File doesn't exist, which is fine for new files
    return null;
  }
};

/**
 * Execution control factory type for dependency injection
 */
export type ExecutionControlFactory = typeof createExecutionControl;
