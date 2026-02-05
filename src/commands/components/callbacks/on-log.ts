import { appStore } from "@tui/index";
import type { LogType } from "@/types/log";

export const onLog = (
  type: string,
  content: string,
  metadata?: Record<string, unknown>,
): void => {
  appStore.addLog({
    type: type as LogType,
    content,
    metadata,
  });
};
