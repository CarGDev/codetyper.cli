import chalk from "chalk";
import { getSessionSummaries } from "@services/core/session";
import { infoMessage } from "@utils/core/terminal";

export const listSessions = async (): Promise<void> => {
  const summaries = await getSessionSummaries();

  if (summaries.length === 0) {
    infoMessage("No saved sessions");
    return;
  }

  console.log("\n" + chalk.bold("Saved Sessions:") + "\n");

  for (const session of summaries.slice(0, 10)) {
    const date = new Date(session.updatedAt).toLocaleDateString();
    const time = new Date(session.updatedAt).toLocaleTimeString();
    const preview = session.lastMessage
      ? session.lastMessage.slice(0, 50).replace(/\n/g, " ")
      : "(no messages)";

    console.log(`  ${chalk.cyan(session.id.slice(0, 20))}...`);
    console.log(
      `    ${chalk.gray(`${date} ${time}`)} - ${session.messageCount} messages`,
    );
    console.log(
      `    ${chalk.gray(preview)}${preview.length >= 50 ? "..." : ""}`,
    );
    console.log();
  }

  if (summaries.length > 10) {
    infoMessage(`... and ${summaries.length - 10} more sessions`);
  }

  console.log(chalk.gray("Resume with: codetyper -r <session-id>"));
  console.log();
};
