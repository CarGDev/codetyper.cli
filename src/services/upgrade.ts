/**
 * Upgrade Service
 *
 * Handles self-update functionality for the CLI
 */

import { exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";
import appVersion from "@/version.json";

const execAsync = promisify(exec);

const REPO_URL = "git@github.com:CarGDev/codetyper.cli.git";
const REPO_API_URL = "https://api.github.com/repos/CarGDev/codetyper.cli";

interface VersionInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
}

interface UpgradeOptions {
  check?: boolean;
  version?: string;
}

interface UpgradeResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  message: string;
}

/**
 * Parse semantic version string
 */
const parseVersion = (
  version: string,
): { major: number; minor: number; patch: number } => {
  const cleaned = version.replace(/^v/, "");
  const [major = 0, minor = 0, patch = 0] = cleaned.split(".").map(Number);
  return { major, minor, patch };
};

/**
 * Compare two semantic versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
const compareVersions = (a: string, b: string): number => {
  const vA = parseVersion(a);
  const vB = parseVersion(b);

  if (vA.major !== vB.major) return vA.major > vB.major ? 1 : -1;
  if (vA.minor !== vB.minor) return vA.minor > vB.minor ? 1 : -1;
  if (vA.patch !== vB.patch) return vA.patch > vB.patch ? 1 : -1;
  return 0;
};

/**
 * Get the current installed version
 */
export const getCurrentVersion = (): string => {
  return appVersion.version;
};

interface GitHubRelease {
  tag_name?: string;
}

interface GitHubTag {
  name?: string;
}

/**
 * Get the latest version from GitHub
 */
export const getLatestVersion = async (): Promise<string> => {
  try {
    // Try to get latest release from GitHub API
    const response = await fetch(`${REPO_API_URL}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "codetyper-cli",
      },
    });

    if (response.ok) {
      const data = (await response.json()) as GitHubRelease;
      return data.tag_name?.replace(/^v/, "") || getCurrentVersion();
    }

    // Fallback: get latest tag
    const tagsResponse = await fetch(`${REPO_API_URL}/tags`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "codetyper-cli",
      },
    });

    if (tagsResponse.ok) {
      const tags = (await tagsResponse.json()) as GitHubTag[];
      if (tags.length > 0) {
        return tags[0].name?.replace(/^v/, "") || getCurrentVersion();
      }
    }

    // Fallback: get latest commit info
    const commitsResponse = await fetch(`${REPO_API_URL}/commits/master`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "codetyper-cli",
      },
    });

    if (commitsResponse.ok) {
      // Can't determine version from commits, return current
      return getCurrentVersion();
    }

    return getCurrentVersion();
  } catch {
    // If we can't reach GitHub, return current version
    return getCurrentVersion();
  }
};

/**
 * Check for available updates
 */
export const checkForUpdates = async (): Promise<VersionInfo> => {
  const current = getCurrentVersion();
  const latest = await getLatestVersion();
  const hasUpdate = compareVersions(latest, current) > 0;

  return { current, latest, hasUpdate };
};

/**
 * Display spinner animation
 */
const createSpinner = (
  message: string,
): { stop: (success: boolean, finalMessage?: string) => void } => {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let isRunning = true;

  const interval = setInterval(() => {
    if (isRunning) {
      process.stdout.write(`\r${chalk.cyan(frames[frameIndex])} ${message}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }
  }, 80);

  return {
    stop: (success: boolean, finalMessage?: string) => {
      isRunning = false;
      clearInterval(interval);
      const icon = success ? chalk.green("✓") : chalk.red("✗");
      const msg = finalMessage || message;
      process.stdout.write(`\r${icon} ${msg}\n`);
    },
  };
};

/**
 * Backup current installation info for rollback
 */
const backupCurrentVersion = async (): Promise<string> => {
  return getCurrentVersion();
};

/**
 * Perform the upgrade
 */
export const performUpgrade = async (
  options: UpgradeOptions = {},
): Promise<UpgradeResult> => {
  const previousVersion = getCurrentVersion();

  // Check only mode
  if (options.check) {
    const versionInfo = await checkForUpdates();

    if (versionInfo.hasUpdate) {
      console.log(
        chalk.yellow(
          `\nUpdate available: ${versionInfo.current} → ${versionInfo.latest}`,
        ),
      );
      console.log(chalk.gray(`Run 'codetyper upgrade' to update\n`));
    } else {
      console.log(
        chalk.green(
          `\nYou're on the latest version (${versionInfo.current})\n`,
        ),
      );
    }

    return {
      success: true,
      previousVersion,
      newVersion: versionInfo.latest,
      message: versionInfo.hasUpdate
        ? "Update available"
        : "Already up to date",
    };
  }

  // Display current version
  console.log(chalk.cyan(`\nCurrent version: ${previousVersion}`));

  // Check for updates first
  const spinner1 = createSpinner("Checking for updates...");
  const versionInfo = await checkForUpdates();
  spinner1.stop(true, "Checked for updates");

  if (!options.version && !versionInfo.hasUpdate) {
    console.log(
      chalk.green(`\nAlready on the latest version (${versionInfo.current})\n`),
    );
    return {
      success: true,
      previousVersion,
      newVersion: versionInfo.current,
      message: "Already up to date",
    };
  }

  const targetVersion = options.version || versionInfo.latest;
  console.log(chalk.cyan(`Target version: ${targetVersion}\n`));

  // Backup current version info
  const backupVersion = await backupCurrentVersion();

  // Perform upgrade
  const spinner2 = createSpinner("Downloading and installing update...");

  try {
    const installCommand = options.version
      ? `npm install -g ${REPO_URL}#v${options.version}`
      : `npm install -g ${REPO_URL}`;

    await execAsync(installCommand, {
      timeout: 120000, // 2 minute timeout
    });

    spinner2.stop(true, "Update installed successfully");

    // Verify new version
    const newVersion = options.version || targetVersion;

    console.log(
      chalk.green(
        `\n✓ Successfully upgraded from ${previousVersion} to ${newVersion}`,
      ),
    );
    console.log(
      chalk.gray(
        "Restart your terminal or run 'codetyper --version' to verify\n",
      ),
    );

    return {
      success: true,
      previousVersion,
      newVersion,
      message: `Upgraded from ${previousVersion} to ${newVersion}`,
    };
  } catch (error) {
    spinner2.stop(false, "Update failed");

    // Attempt rollback
    console.log(chalk.yellow("\nAttempting rollback..."));
    const rollbackSpinner = createSpinner(
      `Rolling back to ${backupVersion}...`,
    );

    try {
      await execAsync(`npm install -g ${REPO_URL}#v${backupVersion}`, {
        timeout: 120000,
      });
      rollbackSpinner.stop(true, `Rolled back to ${backupVersion}`);
      console.log(
        chalk.yellow("Rollback successful. Previous version restored.\n"),
      );
    } catch {
      rollbackSpinner.stop(false, "Rollback failed");
      console.log(
        chalk.red("Rollback failed. Manual intervention may be required."),
      );
      console.log(chalk.gray(`Run: npm install -g ${REPO_URL}`));
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      previousVersion,
      newVersion: previousVersion,
      message: `Upgrade failed: ${errorMessage}`,
    };
  }
};

/**
 * Display upgrade help
 */
export const displayUpgradeHelp = (): void => {
  console.log(chalk.bold("\nCodeTyper Upgrade\n"));
  console.log("Usage:");
  console.log(
    chalk.gray("  codetyper upgrade           # Update to latest version"),
  );
  console.log(
    chalk.gray("  codetyper upgrade --check   # Check for updates only"),
  );
  console.log(
    chalk.gray(
      "  codetyper upgrade --version 1.0.0  # Install specific version\n",
    ),
  );
};
