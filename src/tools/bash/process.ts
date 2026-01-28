/**
 * Bash process management utilities
 */

import type { ChildProcess } from "child_process";

import { BASH_DEFAULTS, BASH_SIGNALS } from "@constants/bash";

export const killProcess = (proc: ChildProcess): void => {
  proc.kill(BASH_SIGNALS.TERMINATE);
  setTimeout(() => proc.kill(BASH_SIGNALS.KILL), BASH_DEFAULTS.KILL_DELAY);
};

export const createTimeoutHandler = (
  proc: ChildProcess,
  timeout: number,
  timedOutRef: { value: boolean },
): NodeJS.Timeout =>
  setTimeout(() => {
    timedOutRef.value = true;
    killProcess(proc);
  }, timeout);

export const createAbortHandler = (proc: ChildProcess) => (): void => {
  killProcess(proc);
};

export const setupAbortListener = (
  ctx: { abort: AbortController },
  handler: () => void,
): void => {
  ctx.abort.signal.addEventListener("abort", handler, { once: true });
};

export const removeAbortListener = (
  ctx: { abort: AbortController },
  handler: () => void,
): void => {
  ctx.abort.signal.removeEventListener("abort", handler);
};
