/**
 * Execution Result Interface
 */

export interface ExecutionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  exitCode?: number;
}
