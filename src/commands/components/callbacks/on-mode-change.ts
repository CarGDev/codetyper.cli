import { appStore } from "@tui/index";

export const onModeChange = (mode: string): void => {
  appStore.setMode(mode as Parameters<typeof appStore.setMode>[0]);
};
