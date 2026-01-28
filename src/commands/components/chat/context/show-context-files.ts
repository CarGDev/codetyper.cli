import chalk from "chalk";
import { basename } from "path";
import { getCurrentSession } from "@services/session";
import { infoMessage, filePath } from "@utils/terminal";

export const showContextFiles = (contextFiles: Map<string, string>): void => {
  const session = getCurrentSession();
  const files = session?.contextFiles || [];

  if (files.length === 0 && contextFiles.size === 0) {
    infoMessage("No context files loaded");
    return;
  }

  console.log("\n" + chalk.bold("Context Files:"));

  if (contextFiles.size > 0) {
    console.log(chalk.gray("  Pending (will be included in next message):"));
    for (const [path] of contextFiles) {
      console.log(`    - ${filePath(basename(path))}`);
    }
  }

  if (files.length > 0) {
    console.log(chalk.gray("  In session:"));
    files.forEach((file, index) => {
      console.log(`    ${index + 1}. ${filePath(file)}`);
    });
  }

  console.log();
};
