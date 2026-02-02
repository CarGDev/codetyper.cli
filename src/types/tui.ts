/**
 * TUI Type Definitions
 *
 * Types for TUI components and state management
 */

import type { ProviderModel } from "@/types/providers";
import type { BrainConnectionStatus, BrainUser } from "@/types/brain";

// ============================================================================
// App Mode Types
// ============================================================================

export type AppMode =
  | "idle"
  | "editing"
  | "thinking"
  | "tool_execution"
  | "permission_prompt"
  | "command_menu"
  | "model_select"
  | "agent_select"
  | "theme_select"
  | "mode_select"
  | "mcp_select"
  | "mcp_add"
  | "mcp_browse"
  | "file_picker"
  | "provider_select"
  | "learning_prompt"
  | "help_menu"
  | "help_detail"
  | "brain_menu"
  | "brain_login";

/** Screen mode for determining which view to show */
export type ScreenMode = "home" | "session";

/** Interaction mode for determining AI behavior */
export type InteractionMode = "agent" | "ask" | "code-review";

// ============================================================================
// Command Types
// ============================================================================

export type CommandCategory = "general" | "session" | "settings" | "account";

export interface SlashCommand {
  name: string;
  description: string;
  category: CommandCategory;
}

export interface CommandMenuState {
  isOpen: boolean;
  filter: string;
  selectedIndex: number;
}

// ============================================================================
// Select Menu Types
// ============================================================================

export interface SelectOption {
  key: string;
  label: string;
  value: string;
  description?: string;
}

// ============================================================================
// Suggestion Prompt Types
// ============================================================================

export interface SuggestionPrompt {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export interface SuggestionState {
  suggestions: SuggestionPrompt[];
  selectedIndex: number;
  visible: boolean;
}

// ============================================================================
// Diff Types
// ============================================================================

export interface DiffData {
  filePath?: string;
  additions: number;
  deletions: number;
  isDiff: boolean;
}

export type DiffLineType =
  | "add"
  | "remove"
  | "context"
  | "header"
  | "hunk"
  | "summary";

export interface DiffLineData {
  type: DiffLineType;
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface DiffViewProps {
  lines: DiffLineData[];
  filePath?: string;
  additions?: number;
  deletions?: number;
  compact?: boolean;
  language?: string;
}

export interface DiffLineProps {
  line: DiffLineData;
  showLineNumbers: boolean;
  maxLineNumWidth: number;
  language?: string;
}

// ============================================================================
// Log Types
// ============================================================================

export type LogEntryType =
  | "user"
  | "assistant"
  | "assistant_streaming"
  | "tool"
  | "error"
  | "system"
  | "thinking";

export type ToolStatus = "pending" | "running" | "success" | "error";

export interface LogEntryMetadata {
  toolName?: string;
  toolStatus?: ToolStatus;
  toolDescription?: string;
  diffData?: DiffData;
  quiet?: boolean;
  isStreaming?: boolean;
  streamComplete?: boolean;
}

export interface LogEntry {
  id: string;
  type: LogEntryType;
  content: string;
  timestamp: number;
  metadata?: LogEntryMetadata;
}

export interface LogEntryProps {
  entry: LogEntry;
}

export interface ThinkingIndicatorProps {
  message: string;
}

// ============================================================================
// Tool Call Types
// ============================================================================

export interface ToolCall {
  id: string;
  name: string;
  description: string;
  status: ToolStatus;
  result?: string;
  error?: string;
}

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionType = "bash" | "read" | "write" | "edit";

export type PermissionScope = "once" | "session" | "local" | "global";

export interface PermissionRequest {
  id: string;
  type: PermissionType;
  description: string;
  command?: string;
  path?: string;
  resolve: (response: PermissionResponse) => void;
}

export interface PermissionResponse {
  allowed: boolean;
  scope?: PermissionScope;
}

// ============================================================================
// Learning Types
// ============================================================================

export type LearningScope = "local" | "global";

export interface LearningPrompt {
  id: string;
  content: string;
  context: string;
  category: string;
  resolve: (response: LearningResponse) => void;
}

export interface LearningResponse {
  save: boolean;
  scope?: LearningScope;
  editedContent?: string;
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionStats {
  startTime: number;
  inputTokens: number;
  outputTokens: number;
  thinkingStartTime: number | null;
  lastThinkingDuration: number;
  contextMaxTokens: number;
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamingLogState {
  logId: string | null;
  content: string;
  isStreaming: boolean;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface HeaderProps {
  version?: string;
  provider?: string;
  model?: string;
  showBanner?: boolean;
}

export interface CommandMenuProps {
  onSelect: (command: string) => void;
  onCancel?: () => void;
  isActive?: boolean;
}

// ============================================================================
// App State Types
// ============================================================================

export interface AppState {
  // Application mode
  mode: AppMode;

  // Screen mode (home vs session)
  screenMode: ScreenMode;

  // Interaction mode (agent, ask, code-review)
  interactionMode: InteractionMode;

  // Input state
  inputBuffer: string;
  inputCursorPosition: number;

  // Log entries
  logs: LogEntry[];

  // Current execution state
  currentToolCall: ToolCall | null;
  permissionRequest: PermissionRequest | null;
  learningPrompt: LearningPrompt | null;
  thinkingMessage: string | null;

  // Session info
  sessionId: string | null;
  provider: string;
  model: string;
  version: string;

  // Command menu state
  commandMenu: CommandMenuState;

  // Available models for selection (with cost info)
  availableModels: ProviderModel[];

  // Session statistics
  sessionStats: SessionStats;

  // UI state
  todosVisible: boolean;
  interruptPending: boolean;
  exitPending: boolean;
  isCompacting: boolean;

  // Scroll state
  scrollOffset: number;
  autoScroll: boolean;
  userScrolled: boolean;
  isSettling: boolean;
  totalLines: number;
  visibleHeight: number;

  // Streaming state
  streamingLog: StreamingLogState;

  // Suggestion prompts state
  suggestions: SuggestionState;

  // Brain state
  brain: {
    status: BrainConnectionStatus;
    user: BrainUser | null;
    knowledgeCount: number;
    memoryCount: number;
    showBanner: boolean;
  };

  // Actions
  setMode: (mode: AppMode) => void;
  setScreenMode: (screenMode: ScreenMode) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  toggleInteractionMode: () => void;
  setInputBuffer: (buffer: string) => void;
  setInputCursorPosition: (position: number) => void;
  appendToInput: (text: string) => void;
  clearInput: () => void;

  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  updateLog: (id: string, updates: Partial<LogEntry>) => void;
  clearLogs: () => void;

  setCurrentToolCall: (toolCall: ToolCall | null) => void;
  updateToolCall: (updates: Partial<ToolCall>) => void;

  setPermissionRequest: (request: PermissionRequest | null) => void;
  setLearningPrompt: (prompt: LearningPrompt | null) => void;
  setThinkingMessage: (message: string | null) => void;

  setSessionInfo: (sessionId: string, provider: string, model: string) => void;
  setVersion: (version: string) => void;

  // Command menu actions
  openCommandMenu: () => void;
  closeCommandMenu: () => void;
  setCommandFilter: (filter: string) => void;
  setCommandSelectedIndex: (index: number) => void;

  // Model actions
  setAvailableModels: (models: ProviderModel[]) => void;
  setModel: (model: string) => void;

  // Session stats actions
  startThinking: () => void;
  stopThinking: () => void;
  addTokens: (input: number, output: number) => void;
  resetSessionStats: () => void;

  // UI state actions
  toggleTodos: () => void;
  setInterruptPending: (pending: boolean) => void;
  setExitPending: (pending: boolean) => void;
  setIsCompacting: (compacting: boolean) => void;

  // Scroll actions
  scrollUp: (lines?: number) => void;
  scrollDown: (lines?: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  setAutoScroll: (enabled: boolean) => void;
  setUserScrolled: (scrolled: boolean) => void;
  setScrollDimensions: (totalLines: number, visibleHeight: number) => void;
  pauseAutoScroll: () => void;
  resumeAutoScroll: () => void;
  getEffectiveScrollOffset: () => number;

  // Streaming actions
  startStreaming: () => string;
  appendStreamContent: (content: string) => void;
  completeStreaming: () => void;
  cancelStreaming: () => void;

  // Suggestion actions
  setSuggestions: (suggestions: SuggestionPrompt[]) => void;
  clearSuggestions: () => void;
  selectSuggestion: (index: number) => void;
  nextSuggestion: () => void;
  prevSuggestion: () => void;
  hideSuggestions: () => void;
  showSuggestions: () => void;

  // Brain actions
  setBrainStatus: (status: BrainConnectionStatus) => void;
  setBrainUser: (user: BrainUser | null) => void;
  setBrainCounts: (knowledge: number, memory: number) => void;
  setBrainShowBanner: (show: boolean) => void;
  dismissBrainBanner: () => void;

  // Computed
  isInputLocked: () => boolean;
}
