/**
 * Agent commands for TUI
 */

import { agentLoader } from "@services/agent-loader";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
} from "@/types/chat-service";

export const showAgentsList = async (
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const agents = await agentLoader.getAvailableAgents(process.cwd());
  const currentAgent =
    (state as ChatServiceState & { currentAgent?: string }).currentAgent ??
    "coder";

  const lines: string[] = ["Available Agents", ""];

  for (const agent of agents) {
    const isCurrent = agent.id === currentAgent;
    const marker = isCurrent ? "→ " : "  ";
    const nameDisplay = isCurrent ? `[${agent.name}]` : agent.name;

    lines.push(`${marker}${nameDisplay}`);

    if (agent.description) {
      lines.push(`     ${agent.description}`);
    }
  }

  lines.push("");
  lines.push("Use /agent <name> to switch agents");

  callbacks.onLog("system", lines.join("\n"));
};

export const switchAgentById = async (
  agentId: string,
  state: ChatServiceState,
): Promise<{ success: boolean; message: string }> => {
  const agents = await agentLoader.getAvailableAgents(process.cwd());
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return { success: false, message: `Agent not found: ${agentId}` };
  }

  // Store current agent on state
  (state as ChatServiceState & { currentAgent?: string }).currentAgent =
    agent.id;

  // Update system prompt with agent prompt
  if (agent.prompt) {
    const basePrompt = state.systemPrompt;
    state.systemPrompt = `${agent.prompt}\n\n${basePrompt}`;

    // Update the system message in messages array
    if (state.messages.length > 0 && state.messages[0].role === "system") {
      state.messages[0].content = state.systemPrompt;
    }
  }

  let message = `Switched to agent: ${agent.name}`;
  if (agent.description) {
    message += `\n${agent.description}`;
  }

  return { success: true, message };
};
