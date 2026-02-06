/**
 * Shared command execution helpers for clipboard operations
 *
 * Extracted from clipboard-service.ts to be reused across
 * text and image clipboard modules.
 */

import { spawn, execSync } from "child_process";
import { CLIPBOARD_COMMAND_TIMEOUT_MS } from "@constants/clipboard";

/** Run a command and return stdout as Buffer and stderr as string */
export const runCommand = (
  command: string,
  args: string[],
): Promise<{ stdout: Buffer; stderr: string }> => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    const stdout: Buffer[] = [];
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timed out after ${CLIPBOARD_COMMAND_TIMEOUT_MS}ms: ${command}`));
    }, CLIPBOARD_COMMAND_TIMEOUT_MS);

    proc.stdout.on("data", (data: Buffer) => stdout.push(data));
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout: Buffer.concat(stdout), stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

/** Run a command and return stdout as trimmed string */
export const runCommandText = async (
  command: string,
  args: string[],
): Promise<string> => {
  const { stdout } = await runCommand(command, args);
  return stdout.toString().trim();
};

/** Spawn a command with stdin piping, write text, and wait for exit */
export const runCommandWithStdin = (
  command: string,
  args: string[],
  input: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["pipe", "ignore", "ignore"],
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Command timed out after ${CLIPBOARD_COMMAND_TIMEOUT_MS}ms: ${command}`));
    }, CLIPBOARD_COMMAND_TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}: ${command}`));
      }
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
};

/** Check if a command is available on the system */
export const commandExists = (name: string): boolean => {
  try {
    execSync(`which ${name}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
