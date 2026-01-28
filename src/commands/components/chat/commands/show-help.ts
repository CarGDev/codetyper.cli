import chalk from "chalk";
import { HELP_COMMANDS } from "@constants/help-commands.ts";

export const showHelp = (): void => {
  console.log("\n" + chalk.bold.underline("Commands") + "\n");

  for (const [cmd, desc] of HELP_COMMANDS) {
    console.log(`  ${chalk.yellow(cmd.padEnd(20))} ${desc}`);
  }

  console.log("\n" + chalk.bold.underline("File References") + "\n");
  console.log(`  ${chalk.yellow("@<file>")}           Add a file to context`);
  console.log(
    `  ${chalk.yellow('@"file with spaces"')} Add file with spaces in name`,
  );
  console.log(
    `  ${chalk.yellow("@src/*.ts")}         Add files matching glob pattern`,
  );

  console.log("\n" + chalk.bold.underline("Examples") + "\n");
  console.log("  @src/app.ts explain this code");
  console.log("  @src/utils.ts @src/types.ts refactor these files");
  console.log("  /model gpt-4o");
  console.log("  /provider copilot\n");
};
