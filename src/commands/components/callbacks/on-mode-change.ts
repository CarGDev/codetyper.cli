import { appStore } from "@tui/index.ts";

export const onModeChange = (mode: string): void => {
  appStore.setMode(mode as Parameters<typeof appStore.setMode>[0]);
};
