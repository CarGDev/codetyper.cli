import { appStore } from "@tui-solid/context/app";

export const onModeChange = (mode: string): void => {
  appStore.setMode(mode as Parameters<typeof appStore.setMode>[0]);
};
