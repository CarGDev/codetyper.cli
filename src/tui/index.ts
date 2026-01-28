/**
 * TUI Module - Terminal User Interface for CodeTyper
 * Re-exports from @opentui/solid implementation
 */

export * from "@tui/types";
export { tui, appStore } from "@tui-solid/index";
export type { TuiRenderOptions } from "@tui-solid/app";
export {
  useAppStore,
  AppStoreProvider,
  useTheme,
  ThemeProvider,
  useRoute,
  RouteProvider,
  useKeybind,
  KeybindProvider,
  useDialog,
  DialogProvider,
  useExit,
  ExitProvider,
} from "@tui-solid/context";
