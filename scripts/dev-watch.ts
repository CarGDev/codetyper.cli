#!/usr/bin/env bun
/**
 * Development watch script for codetyper-cli
 *
 * Watches for file changes and restarts the TUI application properly,
 * handling terminal cleanup between restarts.
 */

import { spawn, type Subprocess } from "bun";
import { watch } from "chokidar";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

const WATCH_PATHS = ["src/**/*.ts", "src/**/*.tsx"];

const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/*.test.ts",
  "**/*.spec.ts",
];

const DEBOUNCE_MS = 300;

let currentProcess: Subprocess | null = null;
let restartTimeout: ReturnType<typeof setTimeout> | null = null;

const clearTerminal = (): void => {
  // Reset terminal and clear screen
  process.stdout.write("\x1b[2J\x1b[H\x1b[3J");
};

const killProcess = async (): Promise<void> => {
  if (currentProcess) {
    try {
      currentProcess.kill("SIGTERM");
      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (currentProcess.exitCode === null) {
        currentProcess.kill("SIGKILL");
      }
    } catch {
      // Process might already be dead
    }
    currentProcess = null;
  }
};

const startProcess = (): void => {
  clearTerminal();
  console.log("\x1b[36m[dev-watch]\x1b[0m Starting codetyper...");
  console.log("\x1b[90m─────────────────────────────────────\x1b[0m\n");

  currentProcess = spawn({
    cmd: ["bun", "src/index.ts"],
    cwd: ROOT_DIR,
    stdio: ["inherit", "inherit", "inherit"],
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  });

  currentProcess.exited.then((code) => {
    if (code !== 0 && code !== null) {
      console.log(
        `\n\x1b[33m[dev-watch]\x1b[0m Process exited with code ${code}`,
      );
    }
  });
};

const scheduleRestart = (path: string): void => {
  if (restartTimeout) {
    clearTimeout(restartTimeout);
  }

  restartTimeout = setTimeout(async () => {
    console.log(`\n\x1b[33m[dev-watch]\x1b[0m Change detected: ${path}`);
    console.log("\x1b[33m[dev-watch]\x1b[0m Restarting...\n");

    await killProcess();
    startProcess();
  }, DEBOUNCE_MS);
};

const main = async (): Promise<void> => {
  console.log("\x1b[36m[dev-watch]\x1b[0m Watching for changes...");
  console.log(`\x1b[90mRoot: ${ROOT_DIR}\x1b[0m`);
  console.log(`\x1b[90mPaths: ${WATCH_PATHS.join(", ")}\x1b[0m`);

  const watcher = watch(WATCH_PATHS, {
    ignored: IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    cwd: ROOT_DIR,
    usePolling: false,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100,
    },
  });

  watcher.on("ready", () => {
    console.log("\x1b[32m[dev-watch]\x1b[0m Watcher ready\n");
  });

  watcher.on("error", (error) => {
    console.error("\x1b[31m[dev-watch]\x1b[0m Watcher error:", error);
  });

  watcher.on("change", scheduleRestart);
  watcher.on("add", scheduleRestart);
  watcher.on("unlink", scheduleRestart);

  // Handle exit signals
  const cleanup = async (): Promise<void> => {
    console.log("\n\x1b[36m[dev-watch]\x1b[0m Shutting down...");
    await watcher.close();
    await killProcess();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Start the initial process
  startProcess();
};

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
