/**
 * GitHub CLI Detection and Status
 *
 * Check if gh CLI is installed and authenticated.
 */

import { spawn } from "child_process";
import type { GitHubCLIStatus } from "@/types/github-pr";

let cachedStatus: GitHubCLIStatus | null = null;

const runCommand = (
  command: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("error", () => {
      resolve({ exitCode: 1, stdout: "", stderr: "Command not found" });
    });

    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
};

/**
 * Check if GitHub CLI (gh) is installed and authenticated
 */
export const checkGitHubCLI = async (): Promise<GitHubCLIStatus> => {
  if (cachedStatus) {
    return cachedStatus;
  }

  try {
    // Check if gh is installed
    const versionResult = await runCommand("gh", ["--version"]);

    if (versionResult.exitCode !== 0) {
      cachedStatus = {
        installed: false,
        authenticated: false,
        error: "GitHub CLI (gh) is not installed",
      };
      return cachedStatus;
    }

    // Extract version
    const versionMatch = versionResult.stdout.match(/gh version ([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    // Check authentication status
    const authResult = await runCommand("gh", ["auth", "status"]);
    const authenticated = authResult.exitCode === 0;

    cachedStatus = {
      installed: true,
      authenticated,
      version,
      error: authenticated ? undefined : "Not authenticated with GitHub CLI",
    };

    return cachedStatus;
  } catch (error) {
    cachedStatus = {
      installed: false,
      authenticated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    return cachedStatus;
  }
};

/**
 * Clear cached CLI status (useful for re-checking after login)
 */
export const clearCLIStatusCache = (): void => {
  cachedStatus = null;
};

/**
 * Execute a gh command and return the output
 */
export const executeGHCommand = async (
  args: string[],
): Promise<{ success: boolean; output: string; error?: string }> => {
  try {
    const result = await runCommand("gh", args);

    if (result.exitCode !== 0) {
      return {
        success: false,
        output: "",
        error: result.stderr || "Command failed",
      };
    }

    return {
      success: true,
      output: result.stdout,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
