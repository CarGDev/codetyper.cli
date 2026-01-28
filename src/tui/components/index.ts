/**
 * TUI Components - Export all components
 */

export { LogPanel } from "@tui/components/LogPanel";
export { InputArea } from "@tui/components/InputArea";
export { PermissionModal } from "@tui/components/PermissionModal";
export { StatusBar } from "@tui/components/StatusBar";
export { Header } from "@tui/components/Header";
export { SelectMenu } from "@tui/components/SelectMenu";
export { FilePicker } from "@tui/components/FilePicker";
export { CommandMenu, SLASH_COMMANDS } from "@tui/components/CommandMenu";
export { ModelSelect } from "@tui/components/ModelSelect";
export { AgentSelect } from "@tui/components/AgentSelect";
export { ThemeSelect } from "@tui/components/ThemeSelect";
export { MCPSelect } from "@tui/components/MCPSelect";
export { TodoPanel } from "@tui/components/TodoPanel";
export { LearningModal } from "@tui/components/LearningModal";
export { BouncingLoader } from "@tui/components/BouncingLoader";
export {
  DiffView,
  parseDiffOutput,
  isDiffContent,
} from "@tui/components/DiffView";

// Home screen components
export {
  HomeScreen,
  HomeContent,
  SessionHeader,
  Logo,
  HomeFooter,
  PromptBox,
} from "@tui/components/home/index";

// Re-export types for convenience
export type { SelectOption } from "@/types/tui";
export type { DiffLineData, DiffViewProps } from "@/types/tui";
