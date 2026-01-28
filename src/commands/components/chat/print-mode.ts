import chalk from "chalk";
import { basename, extname } from "path";
import { initializePermissions } from "@services/permissions";
import { createAgent } from "@services/agent";
import type { ChatState } from "@commands/components/chat/state";
import { processFileReferences } from "@commands/components/chat/context/process-file-references";

export const executePrintMode = async (
  prompt: string,
  state: ChatState,
): Promise<void> => {
  const processedPrompt = await processFileReferences(
    prompt,
    state.contextFiles,
  );

  let userMessage = processedPrompt;
  if (state.contextFiles.size > 0) {
    const contextParts: string[] = [];
    for (const [path, fileContent] of state.contextFiles) {
      const ext = extname(path).slice(1) || "txt";
      contextParts.push(
        `File: ${basename(path)}\n\`\`\`${ext}\n${fileContent}\n\`\`\``,
      );
    }
    userMessage = contextParts.join("\n\n") + "\n\n" + processedPrompt;
  }

  state.messages.push({ role: "user", content: userMessage });

  await initializePermissions();

  const agent = createAgent(process.cwd(), {
    provider: state.currentProvider,
    model: state.currentModel,
    verbose: state.verbose,
    autoApprove: state.autoApprove,
    onToolCall: (call) => {
      console.error(chalk.cyan(`[Tool: ${call.name}]`));
    },
    onToolResult: (_callId, result) => {
      if (result.success) {
        console.error(chalk.green(`✓ ${result.title}`));
      } else {
        console.error(chalk.red(`✗ ${result.title}: ${result.error}`));
      }
    },
  });

  try {
    const result = await agent.run(state.messages);

    if (result.finalResponse) {
      console.log(result.finalResponse);
    }

    if (state.verbose && result.toolCalls.length > 0) {
      const successful = result.toolCalls.filter(
        (tc) => tc.result.success,
      ).length;
      console.error(
        chalk.gray(
          `[Tools: ${successful}/${result.toolCalls.length} successful, ${result.iterations} iteration(s)]`,
        ),
      );
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error}`));
    process.exit(1);
  }
};
