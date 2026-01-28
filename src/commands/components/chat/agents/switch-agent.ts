/**
 * Switch agent command
 */

import chalk from "chalk";
import { errorMessage, infoMessage, warningMessage } from "@utils/terminal";
import { agentLoader } from "@services/agent-loader";
import type { ChatState } from "@commands/components/chat/state";

export const switchAgent = async (
  agentName: string,
  state: ChatState,
): Promise<void> => {
  if (!agentName.trim()) {
    warningMessage("Usage: /agent <name>");
    infoMessage("Use /agents to see available agents");
    return;
  }

  const normalizedName = agentName.toLowerCase().trim();
  const agents = await agentLoader.getAvailableAgents(process.cwd());

  // Find agent by id or partial name match
  const agent = agents.find(
    (a) =>
      a.id === normalizedName ||
      a.name.toLowerCase() === normalizedName ||
      a.id.includes(normalizedName) ||
      a.name.toLowerCase().includes(normalizedName),
  );

  if (!agent) {
    errorMessage(`Agent not found: ${agentName}`);
    infoMessage("Use /agents to see available agents");
    return;
  }

  state.currentAgent = agent.id;

  // Update system prompt with agent prompt
  if (agent.prompt) {
    // Prepend agent prompt to system prompt
    const basePrompt = state.systemPrompt;
    state.systemPrompt = `${agent.prompt}\n\n${basePrompt}`;

    // Update the system message in messages array
    if (state.messages.length > 0 && state.messages[0].role === "system") {
      state.messages[0].content = state.systemPrompt;
    }
  }

  console.log();
  console.log(chalk.green(`✓ Switched to agent: ${chalk.bold(agent.name)}`));

  if (agent.description) {
    console.log(chalk.gray(`  ${agent.description}`));
  }

  console.log();
};
