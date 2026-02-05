/**
 * Execution Control Types
 *
 * Types for controlling agent execution flow.
 * Supports pause/resume, step-by-step mode, and abort with rollback.
 */

/**
 * Execution state values
 */
export type ExecutionState =
  | "running"
  | "paused"
  | "stepping"
  | "aborted"
  | "completed";

/**
 * Rollback action for undo on abort
 */
export interface RollbackAction {
  /** Unique identifier for this action */
  id: string;
  /** Type of action to rollback */
  type: "file_write" | "file_edit" | "file_delete" | "bash_command";
  /** Description of the action */
  description: string;
  /** Original state before the action */
  originalState?: {
    filePath?: string;
    content?: string;
  };
  /** Timestamp when action was performed */
  timestamp: number;
}

/**
 * Execution control interface
 * Provides methods to control agent execution flow
 */
export interface ExecutionControl {
  /** Pause the current execution */
  pause(): void;
  /** Resume paused execution */
  resume(): void;
  /** Abort execution with optional rollback */
  abort(rollback?: boolean): Promise<void>;
  /** Enable/disable step-by-step mode */
  stepMode(enabled: boolean): void;
  /** Advance one step in step mode */
  step(): void;
  /** Get current execution state */
  getState(): ExecutionState;
  /** Get pending rollback actions */
  getRollbackActions(): RollbackAction[];
  /** Check if execution is waiting for step confirmation */
  isWaitingForStep(): boolean;
}

/**
 * Execution control state for internal tracking
 */
export interface ExecutionControlState {
  /** Current execution state */
  state: ExecutionState;
  /** Whether step-by-step mode is enabled */
  stepModeEnabled: boolean;
  /** Whether currently waiting for step confirmation */
  waitingForStep: boolean;
  /** Stack of rollback actions for undo on abort */
  rollbackStack: RollbackAction[];
  /** Promise resolver for pause/step resume */
  resumeResolver: (() => void) | null;
  /** Step resolver for step-by-step mode */
  stepResolver: (() => void) | null;
}

/**
 * Execution control events
 */
export interface ExecutionControlEvents {
  /** Called when execution is paused */
  onPause?: () => void;
  /** Called when execution is resumed */
  onResume?: () => void;
  /** Called when entering step mode */
  onStepModeEnabled?: () => void;
  /** Called when step mode is disabled */
  onStepModeDisabled?: () => void;
  /** Called when waiting for step confirmation */
  onWaitingForStep?: (toolName: string, toolArgs: Record<string, unknown>) => void;
  /** Called when abort is initiated */
  onAbort?: (rollbackCount: number) => void;
  /** Called when a rollback action is performed */
  onRollback?: (action: RollbackAction) => void;
  /** Called when rollback is complete */
  onRollbackComplete?: (actionsRolledBack: number) => void;
}

/**
 * Keyboard shortcuts for execution control
 */
export const EXECUTION_CONTROL_KEYS = {
  /** Toggle pause/resume */
  togglePause: "ctrl+p",
  /** Toggle step mode */
  toggleStepMode: "ctrl+s",
  /** Advance one step in step mode */
  step: "enter",
  /** Abort execution */
  abort: "ctrl+c",
  /** Abort with rollback */
  abortWithRollback: "ctrl+z",
} as const;

/**
 * Default execution control state factory
 */
export const createExecutionControlState = (): ExecutionControlState => ({
  state: "running",
  stepModeEnabled: false,
  waitingForStep: false,
  rollbackStack: [],
  resumeResolver: null,
  stepResolver: null,
});
