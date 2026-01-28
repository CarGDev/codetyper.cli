/**
 * Bash tool for executing shell commands
 *
 * Output is captured and returned in the result - NOT streamed to stdout.
 * This allows the TUI to remain interactive during command execution.
 */

export { bashParams, type BashParamsSchema } from "@tools/bash/params";
export {
  truncateOutput,
  createOutputHandler,
  updateRunningStatus,
} from "@tools/bash/output";
export {
  killProcess,
  createTimeoutHandler,
  createAbortHandler,
  setupAbortListener,
  removeAbortListener,
} from "@tools/bash/process";
export { executeBash, bashTool } from "@tools/bash/execute";
