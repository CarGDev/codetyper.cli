/**
 * Command executor with permission system
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { promptBashPermission } from "@services/core/permissions";
import type { ExecutionResult } from "@interfaces/ExecutionResult";

const execAsync = promisify(exec);

/**
 * Executor state
 */
let workingDir = process.cwd();

/**
 * Set working directory
 */
export const setWorkingDir = (dir: string): void => {
  workingDir = dir;
};

/**
 * Get working directory
 */
export const getWorkingDir = (): string => workingDir;

/**
 * Execute a shell command with permission check
 */
export const executeCommand = async (
  command: string,
  description?: string,
  requirePermission = true,
): Promise<ExecutionResult> => {
  // Check permission
  if (requirePermission) {
    const { allowed } = await promptBashPermission(
      command,
      description ?? "Execute shell command",
    );

    if (!allowed) {
      return {
        success: false,
        error: "Permission denied by user",
      };
    }
  }

  console.log(chalk.gray(`$ ${command}`));

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 300000, // 5 minutes
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: unknown) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message: string;
      code?: number;
    };
    return {
      success: false,
      stdout: err.stdout?.trim(),
      stderr: err.stderr?.trim(),
      error: err.message,
      exitCode: err.code,
    };
  }
};

/**
 * Execute a command with real-time output streaming
 */
export const executeStreamingCommand = async (
  command: string,
  args: string[],
  description?: string,
  onOutput?: (data: string) => void,
): Promise<ExecutionResult> => {
  const fullCommand = `${command} ${args.join(" ")}`;

  const { allowed } = await promptBashPermission(
    fullCommand,
    description ?? "Execute shell command",
  );

  if (!allowed) {
    return {
      success: false,
      error: "Permission denied by user",
    };
  }

  console.log(chalk.gray(`$ ${fullCommand}`));

  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: workingDir,
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      onOutput?.(text);
    });

    proc.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      onOutput?.(text);
    });

    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
      });
    });

    proc.on("error", (error) => {
      resolve({
        success: false,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: error.message,
      });
    });
  });
};

/**
 * Read a file
 */
export const readFile = async (
  filePath: string,
): Promise<{ content: string | null; error?: string }> => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workingDir, filePath);

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return { content };
  } catch (error: unknown) {
    const err = error as { message: string };
    return { content: null, error: err.message };
  }
};

/**
 * Write a file with permission check
 */
export const writeFile = async (
  filePath: string,
  content: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workingDir, filePath);

  const { allowed } = await promptBashPermission(
    `write ${fullPath}`,
    description ?? `Write to file: ${filePath}`,
  );

  if (!allowed) {
    return { success: false, error: "Permission denied by user" };
  }

  try {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    console.log(chalk.green(`✓ Wrote ${filePath}`));
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message: string };
    return { success: false, error: err.message };
  }
};

/**
 * Edit a file with permission check
 */
export const editFile = async (
  filePath: string,
  oldContent: string,
  newContent: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workingDir, filePath);

  const { allowed } = await promptBashPermission(
    `edit ${fullPath}`,
    description ?? `Edit file: ${filePath}`,
  );

  if (!allowed) {
    return { success: false, error: "Permission denied by user" };
  }

  try {
    const currentContent = await fs.readFile(fullPath, "utf-8");

    if (!currentContent.includes(oldContent)) {
      return { success: false, error: "Could not find content to replace" };
    }

    const updated = currentContent.replace(oldContent, newContent);
    await fs.writeFile(fullPath, updated, "utf-8");
    console.log(chalk.green(`✓ Edited ${filePath}`));
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message: string };
    return { success: false, error: err.message };
  }
};

/**
 * Delete a file with permission check
 */
export const deleteFile = async (
  filePath: string,
): Promise<{ success: boolean; error?: string }> => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workingDir, filePath);

  const { allowed } = await promptBashPermission(
    `delete ${fullPath}`,
    `Delete file: ${filePath}`,
  );

  if (!allowed) {
    return { success: false, error: "Permission denied by user" };
  }

  try {
    await fs.unlink(fullPath);
    console.log(chalk.yellow(`✓ Deleted ${filePath}`));
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message: string };
    return { success: false, error: err.message };
  }
};

/**
 * Create a directory with permission check
 */
export const createDirectory = async (
  dirPath: string,
): Promise<{ success: boolean; error?: string }> => {
  const fullPath = path.isAbsolute(dirPath)
    ? dirPath
    : path.join(workingDir, dirPath);

  const { allowed } = await promptBashPermission(
    `mkdir ${fullPath}`,
    `Create directory: ${dirPath}`,
  );

  if (!allowed) {
    return { success: false, error: "Permission denied by user" };
  }

  try {
    await fs.mkdir(fullPath, { recursive: true });
    console.log(chalk.green(`✓ Created directory ${dirPath}`));
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message: string };
    return { success: false, error: err.message };
  }
};

/**
 * List directory contents
 */
export const listDirectory = async (dirPath?: string): Promise<string[]> => {
  const fullPath = dirPath
    ? path.isAbsolute(dirPath)
      ? dirPath
      : path.join(workingDir, dirPath)
    : workingDir;

  try {
    return await fs.readdir(fullPath);
  } catch {
    return [];
  }
};

/**
 * Check if path exists
 */
export const pathExists = async (targetPath: string): Promise<boolean> => {
  const fullPath = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(workingDir, targetPath);

  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get file stats
 */
export const getStats = async (
  targetPath: string,
): Promise<{ isFile: boolean; isDirectory: boolean; size: number } | null> => {
  const fullPath = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(workingDir, targetPath);

  try {
    const stats = await fs.stat(fullPath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
    };
  } catch {
    return null;
  }
};

// Re-export types
export type { ExecutionResult } from "@interfaces/ExecutionResult";
export type { FileOperation } from "@interfaces/FileOperation";
