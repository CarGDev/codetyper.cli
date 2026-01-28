import chalk from "chalk";
import type { ChatState } from "@commands/components/chat/state";

export const showContext = (state: ChatState): void => {
  const messageCount = state.messages.length - 1;
  const totalChars = state.messages.reduce(
    (acc, m) => acc + m.content.length,
    0,
  );
  const estimatedTokens = Math.round(totalChars / 4);

  console.log("\n" + chalk.bold("Context Information:"));
  console.log(`  Messages: ${messageCount}`);
  console.log(`  Characters: ${totalChars.toLocaleString()}`);
  console.log(`  Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
  console.log(`  Pending files: ${state.contextFiles.size}`);
  console.log();
};
