import { appStore } from "@tui/index.ts";
import { isQuietTool } from "@utils/core/tools";
import type { ToolCallParams } from "@interfaces/ToolCallParams.ts";

export const onToolCall = (call: ToolCallParams): void => {
  appStore.setCurrentToolCall({
    id: call.id,
    name: call.name,
    description: call.description,
    status: "running",
  });

  const isQuiet = isQuietTool(call.name, call.args);

  appStore.addLog({
    type: "tool",
    content: call.description,
    metadata: {
      toolName: call.name,
      toolStatus: "running",
      toolDescription: call.description,
      quiet: isQuiet,
    },
  });
};
