/**
 * Chat TUI print mode (non-interactive)
 */

import { createAgent } from "@services/core/agent";
import { initializePermissions } from "@services/core/permissions";
import {
  processFileReferences,
  buildContextMessage,
} from "@services/chat-tui/files";
import type { ChatServiceState } from "@/types/chat-service";

export const executePrintMode = async (
  state: ChatServiceState,
  prompt: string,
): Promise<void> => {
  const processedPrompt = await processFileReferences(state, prompt);
  const userMessage = buildContextMessage(state, processedPrompt);

  state.messages.push({ role: "user", content: userMessage });

  await initializePermissions();

  const agent = createAgent(process.cwd(), {
    provider: state.provider,
    model: state.model,
    verbose: state.verbose,
    autoApprove: state.autoApprove,
    onToolCall: (call) => {
      console.error(`[Tool: ${call.name}]`);
    },
    onToolResult: (_callId, result) => {
      if (result.success) {
        console.error(`✓ ${result.title}`);
      } else {
        console.error(`✗ ${result.title}: ${result.error}`);
      }
    },
  });

  try {
    const result = await agent.run(state.messages);

    if (result.finalResponse) {
      console.log(result.finalResponse);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};
