import chalk from "chalk";
import type { ChatState } from "@commands/components/chat/state";

export const showHistory = (state: ChatState): void => {
  console.log("\n" + chalk.bold("Conversation History:") + "\n");

  for (let i = 1; i < state.messages.length; i++) {
    const msg = state.messages[i];
    const role =
      msg.role === "user" ? chalk.cyan("You") : chalk.green("Assistant");
    const preview = msg.content.slice(0, 100).replace(/\n/g, " ");
    console.log(
      `  ${i}. ${role}: ${preview}${msg.content.length > 100 ? "..." : ""}`,
    );
  }

  console.log();
};
