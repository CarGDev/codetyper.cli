import chalk from "chalk";
import { getCurrentSession } from "@services/core/session";
import { warningMessage } from "@utils/core/terminal";

export const showSessionInfo = async (): Promise<void> => {
  const session = getCurrentSession();
  if (!session) {
    warningMessage("No active session");
    return;
  }

  console.log("\n" + chalk.bold("Session Information:"));
  console.log(`  ID: ${chalk.cyan(session.id)}`);
  console.log(`  Agent: ${session.agent}`);
  console.log(`  Messages: ${session.messages.length}`);
  console.log(`  Context files: ${session.contextFiles.length}`);
  console.log(`  Created: ${new Date(session.createdAt).toLocaleString()}`);
  console.log(`  Updated: ${new Date(session.updatedAt).toLocaleString()}`);
  console.log();
};
