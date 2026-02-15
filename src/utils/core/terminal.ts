/**
 * Terminal UI helpers for formatting and display
 */

import { writeSync } from "fs";
import chalk from "chalk";
import ora, { Ora } from "ora";
import boxen from "boxen";
import { TERMINAL_SEQUENCES } from "@constants/ui";
import { TERMINAL_RESET, DISABLE_MOUSE_TRACKING } from "@constants/terminal";

/**
 * Spinner state
 */
let spinner: Ora | null = null;

/**
 * Track if exit handlers have been registered
 */
let exitHandlersRegistered = false;

/**
 * Drain any pending stdin data (e.g. DECRQM responses from @opentui/core's
 * theme-mode detection that queries mode 997). The terminal responds with
 * `\x1b[?997;1n` or `\x1b[?997;2n`, but if the TUI renderer has already
 * torn down its stdin listener and disabled raw mode, those bytes echo as
 * visible garbage ("997;1n") in the shell.
 *
 * Strategy: re-enable raw mode so the response doesn't echo, attach a
 * temporary listener to swallow any bytes that arrive, wait long enough
 * for the terminal to respond, then clean up.
 */
export const drainStdin = (): Promise<void> =>
  new Promise((resolve) => {
    try {
      if (!process.stdin.isTTY) {
        resolve();
        return;
      }

      // Re-enable raw mode so pending responses don't echo
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      // Disable mouse tracking to prevent mouse events from leaking to shell
      process.stdout.write(DISABLE_MOUSE_TRACKING);

      // Swallow any bytes that arrive
      const sink = (): void => {};
      process.stdin.on("data", sink);

      // Wait for in-flight terminal responses then clean up
      setTimeout(() => {
        try {
          process.stdin.removeListener("data", sink);
          // Read and discard any remaining buffered data
          while (process.stdin.read() !== null) {
            // drain
          }
          process.stdin.setRawMode(false);
          process.stdin.pause();
          // Unref so this doesn't keep the process alive
          process.stdin.unref();
        } catch {
          // Ignore — stdin may already be destroyed
        }
        resolve();
      }, 100);
    } catch {
      resolve();
    }
  });

/**
 * Emergency cleanup for terminal state on process exit
 * Uses writeSync to fd 1 (stdout) to guarantee bytes are flushed
 * before the process terminates
 */
const emergencyTerminalCleanup = (): void => {
  try {
    writeSync(1, TERMINAL_RESET);
  } catch {
    // Ignore errors during cleanup - stdout may already be closed
  }
};

/**
 * Register process exit handlers to ensure terminal cleanup
 * Covers all exit paths: normal exit, signals, crashes, and unhandled rejections
 */
export const registerExitHandlers = (): void => {
  if (exitHandlersRegistered) return;
  exitHandlersRegistered = true;

  process.on("exit", emergencyTerminalCleanup);
  process.on("beforeExit", emergencyTerminalCleanup);
  process.on("SIGINT", () => {
    emergencyTerminalCleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    emergencyTerminalCleanup();
    process.exit(143);
  });
  process.on("SIGHUP", () => {
    emergencyTerminalCleanup();
    process.exit(128);
  });
  process.on("uncaughtException", () => {
    emergencyTerminalCleanup();
    process.exit(1);
  });
  process.on("unhandledRejection", () => {
    emergencyTerminalCleanup();
    process.exit(1);
  });
};

/**
 * Print success message
 */
export const successMessage = (message: string): void => {
  console.log(chalk.green("✓") + " " + message);
};

/**
 * Print error message
 */
export const errorMessage = (message: string): void => {
  console.error(chalk.red("✗") + " " + message);
};

/**
 * Print warning message
 */
export const warningMessage = (message: string): void => {
  console.log(chalk.yellow("⚠") + " " + message);
};

/**
 * Print info message
 */
export const infoMessage = (message: string): void => {
  console.log(chalk.blue("ℹ") + " " + message);
};

/**
 * Print header
 */
export const headerMessage = (text: string): void => {
  console.log("\n" + chalk.bold.cyan(text) + "\n");
};

/**
 * Print a boxed message
 */
export const boxMessage = (message: string, title?: string): void => {
  console.log(
    boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
      title: title,
      titleAlignment: "center",
    }),
  );
};

/**
 * Start spinner
 */
export const startSpinner = (text: string): void => {
  spinner = ora({
    text,
    color: "cyan",
  }).start();
};

/**
 * Update spinner text
 */
export const updateSpinner = (text: string): void => {
  if (spinner) {
    spinner.text = text;
  }
};

/**
 * Stop spinner with success
 */
export const succeedSpinner = (text?: string): void => {
  if (spinner) {
    spinner.succeed(text);
    spinner = null;
  }
};

/**
 * Stop spinner with failure
 */
export const failSpinner = (text?: string): void => {
  if (spinner) {
    spinner.fail(text);
    spinner = null;
  }
};

/**
 * Stop spinner
 */
export const stopSpinner = (): void => {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
};

/**
 * Print divider
 */
export const dividerMessage = (): void => {
  console.log(chalk.gray("─".repeat(process.stdout.columns || 80)));
};

/**
 * Print JSON with syntax highlighting
 */
export const hightLigthedJson = (data: unknown): void => {
  console.log(JSON.stringify(data, null, 2));
};

/**
 * Format file path
 */
export const filePath = (path: string): string => chalk.cyan(path);

/**
 * Format command
 */
export const commandFormat = (cmd: string): string => chalk.yellow(cmd);

/**
 * Format key
 */
export const keyFormat = (text: string): string => chalk.bold(text);

/**
 * Format code
 */
export const codeFormat = (text: string): string => chalk.gray(text);

/**
 * Print a table
 */
export const tableMessage = (data: Array<Record<string, string>>): void => {
  if (data.length === 0) return;

  const keys = Object.keys(data[0]);
  const widths = keys.map((key) =>
    Math.max(key.length, ...data.map((row) => String(row[key]).length)),
  );

  // Header
  const headerLine = keys.map((key, i) => key.padEnd(widths[i])).join("  ");
  console.log(chalk.bold(headerLine));
  console.log(chalk.gray("─".repeat(headerLine.length)));

  // Rows
  data.forEach((row) => {
    const line = keys
      .map((key, i) => String(row[key]).padEnd(widths[i]))
      .join("  ");
    console.log(line);
  });
};

/**
 * Print progress bar
 */
export const progressBar = (
  current: number,
  total: number,
  label?: string,
): void => {
  const percent = Math.floor((current / total) * 100);
  const filled = Math.floor((current / total) * 40);
  const empty = 40 - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const text = label ? `${label} ` : "";
  process.stdout.write(`\r${text}${bar} ${percent}%`);
  if (current === total) {
    process.stdout.write("\n");
  }
};

/**
 * Clear line
 */
export const clearLine = (): void => {
  process.stdout.write("\r\x1b[K");
};

/**
 * Enter fullscreen mode (alternate screen buffer)
 */
export const enterFullscreen = (): void => {
  process.stdout.write(
    TERMINAL_SEQUENCES.ENTER_ALTERNATE_SCREEN +
      TERMINAL_SEQUENCES.CLEAR_SCREEN +
      TERMINAL_SEQUENCES.CURSOR_HOME,
  );
};

/**
 * Exit fullscreen mode (restore main screen buffer)
 * Disables all mouse tracking modes and restores terminal state
 */
export const exitFullscreen = (): void => {
  try {
    writeSync(1, TERMINAL_RESET);
  } catch {
    // Ignore errors - stdout may already be closed
  }
};

/**
 * Clear the entire screen and move cursor to home
 */
export const clearScreen = (): void => {
  process.stdout.write(
    TERMINAL_SEQUENCES.CLEAR_SCREEN +
      TERMINAL_SEQUENCES.CLEAR_SCROLLBACK +
      TERMINAL_SEQUENCES.CURSOR_HOME,
  );
};

/**
 * Ask for confirmation
 */
export const askConfirm = async (message: string): Promise<boolean> => {
  const inquirer = (await import("inquirer")).default;
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message,
      default: false,
    },
  ]);
  return answer.confirmed;
};

/**
 * Prompt for input
 */
export const inputPrompt = async (
  message: string,
  defaultValue?: string,
): Promise<string> => {
  const inquirer = (await import("inquirer")).default;
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message,
      default: defaultValue,
    },
  ]);
  return answer.value;
};

/**
 * Select from list
 */
export const selectList = async (
  message: string,
  choices: string[],
): Promise<string> => {
  const inquirer = (await import("inquirer")).default;
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message,
      choices,
    },
  ]);
  return answer.selected;
};
