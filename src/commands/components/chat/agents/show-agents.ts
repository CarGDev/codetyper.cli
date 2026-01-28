/**
 * Show available agents command
 */

import chalk from "chalk";
import { agentLoader } from "@services/agent-loader";
import type { ChatState } from "@commands/components/chat/state";

export const showAgents = async (state: ChatState): Promise<void> => {
  const agents = await agentLoader.getAvailableAgents(process.cwd());
  const currentAgent = state.currentAgent ?? "coder";

  console.log("\n" + chalk.bold.underline("Available Agents") + "\n");

  for (const agent of agents) {
    const isCurrent = agent.id === currentAgent;
    const marker = isCurrent ? chalk.cyan("→") : " ";
    const nameStyle = isCurrent ? chalk.cyan.bold : chalk.white;

    console.log(`${marker} ${nameStyle(agent.name)}`);

    if (agent.description) {
      console.log(`   ${chalk.gray(agent.description)}`);
    }

    if (agent.model) {
      console.log(`   ${chalk.gray(`Model: ${agent.model}`)}`);
    }

    console.log();
  }

  console.log(chalk.gray("Use /agent <name> to switch agents"));
  console.log();
};
