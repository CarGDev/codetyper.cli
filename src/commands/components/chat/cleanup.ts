import chalk from "chalk";
import type { ChatState } from "./state.ts";

export const createCleanup = (state: ChatState) => (): void => {
  state.isRunning = false;
  if (state.inputEditor) {
    state.inputEditor.stop();
    state.inputEditor = null;
  }
  console.log("\n" + chalk.cyan("Goodbye!"));
  process.exit(0);
};
