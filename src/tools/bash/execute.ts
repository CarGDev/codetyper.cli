/**
 * Bash command execution
 */

import { spawn } from "child_process";

import {
  BASH_DEFAULTS,
  BASH_MESSAGES,
  BASH_DESCRIPTION,
} from "@constants/bash";
import { promptPermission } from "@services/permissions";
import { bashParams } from "@tools/bash/params";
import {
  truncateOutput,
  createOutputHandler,
  updateRunningStatus,
} from "@tools/bash/output";
import {
  createTimeoutHandler,
  createAbortHandler,
  setupAbortListener,
  removeAbortListener,
} from "@tools/bash/process";
import type {
  ToolDefinition,
  ToolContext,
  ToolResult,
  BashParams,
} from "@/types/tools";

const createDeniedResult = (description: string): ToolResult => ({
  success: false,
  title: description,
  output: "",
  error: BASH_MESSAGES.PERMISSION_DENIED,
});

const createTimeoutResult = (
  description: string,
  output: string,
  timeout: number,
  code: number | null,
): ToolResult => ({
  success: false,
  title: description,
  output: truncateOutput(output),
  error: BASH_MESSAGES.TIMED_OUT(timeout),
  metadata: {
    exitCode: code,
    timedOut: true,
  },
});

const createAbortedResult = (
  description: string,
  output: string,
  code: number | null,
): ToolResult => ({
  success: false,
  title: description,
  output: truncateOutput(output),
  error: BASH_MESSAGES.ABORTED,
  metadata: {
    exitCode: code,
    aborted: true,
  },
});

const createCompletedResult = (
  description: string,
  output: string,
  code: number | null,
): ToolResult => ({
  success: code === 0,
  title: description,
  output: truncateOutput(output),
  error: code !== 0 ? BASH_MESSAGES.EXIT_CODE(code ?? -1) : undefined,
  metadata: {
    exitCode: code,
  },
});

const createErrorResult = (
  description: string,
  output: string,
  error: Error,
): ToolResult => ({
  success: false,
  title: description,
  output,
  error: error.message,
});

const checkPermission = async (
  command: string,
  description: string,
  autoApprove: boolean,
): Promise<boolean> => {
  if (autoApprove) {
    return true;
  }

  const result = await promptPermission(command, description);
  return result.allowed;
};

const executeCommand = (
  args: BashParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const {
    command,
    description,
    workdir,
    timeout = BASH_DEFAULTS.TIMEOUT,
  } = args;
  const cwd = workdir ?? ctx.workingDir;

  updateRunningStatus(ctx, description);

  return new Promise((resolve) => {
    const proc = spawn(command, {
      shell: process.env.SHELL ?? "/bin/bash",
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const outputRef = { value: "" };
    const timedOutRef = { value: false };

    const appendOutput = createOutputHandler(ctx, description, outputRef);
    proc.stdout?.on("data", appendOutput);
    proc.stderr?.on("data", appendOutput);

    const timeoutId = createTimeoutHandler(proc, timeout, timedOutRef);
    const abortHandler = createAbortHandler(proc);
    setupAbortListener(ctx, abortHandler);

    proc.on("close", (code) => {
      clearTimeout(timeoutId);
      removeAbortListener(ctx, abortHandler);

      if (timedOutRef.value) {
        resolve(
          createTimeoutResult(description, outputRef.value, timeout, code),
        );
      } else if (ctx.abort.signal.aborted) {
        resolve(createAbortedResult(description, outputRef.value, code));
      } else {
        resolve(createCompletedResult(description, outputRef.value, code));
      }
    });

    proc.on("error", (error) => {
      clearTimeout(timeoutId);
      removeAbortListener(ctx, abortHandler);
      resolve(createErrorResult(description, outputRef.value, error));
    });
  });
};

export const executeBash = async (
  args: BashParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const { command, description } = args;

  const allowed = await checkPermission(
    command,
    description,
    ctx.autoApprove ?? false,
  );

  if (!allowed) {
    return createDeniedResult(description);
  }

  return executeCommand(args, ctx);
};

export const bashTool: ToolDefinition<typeof bashParams> = {
  name: "bash",
  description: BASH_DESCRIPTION,
  parameters: bashParams,
  execute: executeBash,
};
