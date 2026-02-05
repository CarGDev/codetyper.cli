import { appStore } from "@tui-solid/context/app";
import { truncateOutput, detectDiffContent } from "@services/chat-tui-service";
import { getThinkingMessage } from "@constants/status-messages";

export const onToolResult = (
  success: boolean,
  title: string,
  output?: string,
  error?: string,
): void => {
  appStore.updateToolCall({
    status: success ? "success" : "error",
    result: success ? output : undefined,
    error: error,
  });

  const state = appStore.getState();
  const logEntry = state.logs.find(
    (log) => log.type === "tool" && log.metadata?.toolStatus === "running",
  );

  if (logEntry) {
    const diffData = output ? detectDiffContent(output) : undefined;
    const displayContent = diffData?.isDiff
      ? output
      : output
        ? truncateOutput(output)
        : "";

    appStore.updateLog(logEntry.id, {
      content: success
        ? `${title}${displayContent ? "\n" + displayContent : ""}`
        : `${title}: ${error}`,
      metadata: {
        ...logEntry.metadata,
        toolStatus: success ? "success" : "error",
        toolDescription: title,
        diffData: diffData,
      },
    });
  }

  appStore.setThinkingMessage(getThinkingMessage());
};
