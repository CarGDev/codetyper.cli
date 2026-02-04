/**
 * TUI Module - Terminal User Interface for CodeTyper
 * Re-exports from @opentui/solid implementation
 */

export type {
  AppMode,
  CommandCategory,
  SlashCommand,
  CommandMenuState,
  SelectOption,
  DiffData,
  DiffLineType,
  DiffLineData,
  DiffViewProps,
  DiffLineProps,
  LogEntryType,
  ToolStatus,
  LogEntryMetadata,
  LogEntry,
  LogEntryProps,
  ThinkingIndicatorProps,
  ToolCall,
  PermissionType,
  PermissionScope,
  PermissionRequest,
  PermissionResponse,
  LearningScope,
  LearningPrompt,
  LearningResponse,
  SessionStats,
  HeaderProps,
  CommandMenuProps,
  AppState,
} from "@/types/tui";
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
