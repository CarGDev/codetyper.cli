import chalk from "chalk";
import { basename, extname } from "path";
import { addMessage } from "@services/core/session";
import { initializePermissions } from "@services/core/permissions";
import { createAgent } from "@services/core/agent";
import {
  infoMessage,
  errorMessage,
  warningMessage,
} from "@utils/core/terminal";
import { getThinkingMessage } from "@constants/status-messages";
import {
  detectDebuggingRequest,
  buildDebuggingContext,
  getDebuggingPrompt,
} from "@services/debugging-service";
import {
  detectCodeReviewRequest,
  buildCodeReviewContext,
  getCodeReviewPrompt,
} from "@services/code-review-service";
import {
  detectRefactoringRequest,
  buildRefactoringContext,
  getRefactoringPrompt,
} from "@services/refactoring-service";
import {
  detectMemoryCommand,
  processMemoryCommand,
  buildRelevantMemoryPrompt,
} from "@services/memory-service";
import type { ChatState } from "@commands/components/chat/state";

export const sendMessage = async (
  content: string,
  state: ChatState,
): Promise<void> => {
  let userMessage = content;

  if (state.contextFiles.size > 0) {
    const contextParts: string[] = [];
    for (const [path, fileContent] of state.contextFiles) {
      const ext = extname(path).slice(1) || "txt";
      contextParts.push(
        `File: ${basename(path)}\n\`\`\`${ext}\n${fileContent}\n\`\`\``,
      );
    }
    userMessage = contextParts.join("\n\n") + "\n\n" + content;
    state.contextFiles.clear();
  }

  // Detect debugging requests and enhance message with context
  const debugContext = detectDebuggingRequest(userMessage);
  if (debugContext.isDebugging) {
    const debugPrompt = getDebuggingPrompt();
    const contextInfo = buildDebuggingContext(debugContext);

    // Inject debugging system message before user message if not already present
    const hasDebuggingPrompt = state.messages.some(
      (msg) => msg.role === "system" && msg.content.includes("debugging mode"),
    );

    if (!hasDebuggingPrompt) {
      state.messages.push({ role: "system", content: debugPrompt });
    }

    // Append debug context to user message if extracted
    if (contextInfo) {
      userMessage = userMessage + "\n\n" + contextInfo;
    }

    if (state.verbose) {
      infoMessage(`Debugging mode activated: ${debugContext.debugType}`);
    }
  }

  // Detect code review requests and enhance message with context
  const reviewContext = detectCodeReviewRequest(userMessage);
  if (reviewContext.isReview) {
    const reviewPrompt = getCodeReviewPrompt();
    const contextInfo = buildCodeReviewContext(reviewContext);

    // Inject code review system message before user message if not already present
    const hasReviewPrompt = state.messages.some(
      (msg) =>
        msg.role === "system" && msg.content.includes("code review mode"),
    );

    if (!hasReviewPrompt) {
      state.messages.push({ role: "system", content: reviewPrompt });
    }

    // Append review context to user message if extracted
    if (contextInfo) {
      userMessage = userMessage + "\n\n" + contextInfo;
    }

    if (state.verbose) {
      infoMessage(`Code review mode activated: ${reviewContext.reviewType}`);
    }
  }

  // Detect refactoring requests and enhance message with context
  const refactorContext = detectRefactoringRequest(userMessage);
  if (refactorContext.isRefactoring) {
    const refactorPrompt = getRefactoringPrompt();
    const contextInfo = buildRefactoringContext(refactorContext);

    // Inject refactoring system message before user message if not already present
    const hasRefactoringPrompt = state.messages.some(
      (msg) =>
        msg.role === "system" && msg.content.includes("refactoring mode"),
    );

    if (!hasRefactoringPrompt) {
      state.messages.push({ role: "system", content: refactorPrompt });
    }

    // Append refactoring context to user message if extracted
    if (contextInfo) {
      userMessage = userMessage + "\n\n" + contextInfo;
    }

    if (state.verbose) {
      infoMessage(
        `Refactoring mode activated: ${refactorContext.refactoringType}`,
      );
    }
  }

  // Detect memory commands
  const memoryContext = detectMemoryCommand(userMessage);
  if (memoryContext.isMemoryCommand) {
    const result = await processMemoryCommand(memoryContext);
    console.log(chalk.cyan("\n[Memory System]"));
    console.log(
      result.success
        ? chalk.green(result.message)
        : chalk.yellow(result.message),
    );

    // For store/forget commands, still send to agent for confirmation response
    if (
      memoryContext.commandType === "list" ||
      memoryContext.commandType === "query"
    ) {
      // Just display results, don't send to agent
      return;
    }

    if (state.verbose) {
      infoMessage(`Memory command: ${memoryContext.commandType}`);
    }
  }

  // Auto-retrieve relevant memories for context
  const relevantMemoryPrompt = await buildRelevantMemoryPrompt(userMessage);
  if (relevantMemoryPrompt) {
    userMessage = userMessage + "\n\n" + relevantMemoryPrompt;
    if (state.verbose) {
      infoMessage("Relevant memories retrieved");
    }
  }

  state.messages.push({ role: "user", content: userMessage });
  await addMessage("user", content);

  await initializePermissions();

  const agent = createAgent(process.cwd(), {
    provider: state.currentProvider,
    model: state.currentModel,
    verbose: state.verbose,
    autoApprove: state.autoApprove,
    onToolCall: (call) => {
      console.log(chalk.cyan(`\n[Tool: ${call.name}]`));
      if (state.verbose) {
        console.log(chalk.gray(JSON.stringify(call.arguments, null, 2)));
      }
    },
    onToolResult: (_callId, result) => {
      if (result.success) {
        console.log(chalk.green(`✓ ${result.title}`));
      } else {
        console.log(chalk.red(`✗ ${result.title}: ${result.error}`));
      }
    },
    onText: (_text) => {},
  });

  process.stdout.write(chalk.gray(getThinkingMessage() + "\n"));

  try {
    const result = await agent.run(state.messages);

    if (result.finalResponse) {
      state.messages.push({
        role: "assistant",
        content: result.finalResponse,
      });
      await addMessage("assistant", result.finalResponse);

      console.log(chalk.bold("\nAssistant:"));
      console.log(result.finalResponse);
      console.log();

      if (result.toolCalls.length > 0) {
        const successful = result.toolCalls.filter(
          (tc) => tc.result.success,
        ).length;
        infoMessage(
          chalk.gray(
            `Tools: ${successful}/${result.toolCalls.length} successful, ${result.iterations} iteration(s)`,
          ),
        );
      }
    } else if (result.toolCalls.length > 0) {
      const successful = result.toolCalls.filter(
        (tc) => tc.result.success,
      ).length;
      infoMessage(
        chalk.gray(
          `Completed: ${successful}/${result.toolCalls.length} tools successful`,
        ),
      );
    } else {
      warningMessage("No response received");
    }
  } catch (error) {
    errorMessage(`Failed: ${error}`);
  }
};
