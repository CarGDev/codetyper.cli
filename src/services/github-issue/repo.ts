/**
 * Git repository detection utilities
 */

import { exec } from "child_process";
import { promisify } from "util";

import {
  GH_CLI_COMMANDS,
  GITHUB_REMOTE_IDENTIFIER,
} from "@constants/github-issue";

const execAsync = promisify(exec);

export const isGitHubRepo = async (): Promise<boolean> => {
  try {
    const { stdout } = await execAsync(GH_CLI_COMMANDS.GET_REMOTE_URL);
    return stdout.includes(GITHUB_REMOTE_IDENTIFIER);
  } catch {
    return false;
  }
};
