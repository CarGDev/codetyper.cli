import { batch, type Accessor } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { createSimpleContext } from "./helper";
import type {
  AppMode,
  ScreenMode,
  InteractionMode,
  LogEntry,
  ToolCall,
  PermissionRequest,
  LearningPrompt,
  SessionStats,
  SuggestionPrompt,
  CommandMenuState,
  StreamingLogState,
  SuggestionState,
} from "@/types/tui";
import type { ProviderModel } from "@/types/providers";
import type { BrainConnectionStatus, BrainUser } from "@/types/brain";

interface AppStore {
  mode: AppMode;
  screenMode: ScreenMode;
  interactionMode: InteractionMode;
  currentAgent: string;
  inputBuffer: string;
  inputCursorPosition: number;
  logs: LogEntry[];
  currentToolCall: ToolCall | null;
  permissionRequest: PermissionRequest | null;
  learningPrompt: LearningPrompt | null;
  thinkingMessage: string | null;
  sessionId: string | null;
  provider: string;
  model: string;
  version: string;
  commandMenu: CommandMenuState;
  availableModels: ProviderModel[];
  sessionStats: SessionStats;
  todosVisible: boolean;
  debugLogVisible: boolean;
  interruptPending: boolean;
  exitPending: boolean;
  isCompacting: boolean;
  streamingLog: StreamingLogState;
  suggestions: SuggestionState;
  cascadeEnabled: boolean;
  brain: {
    status: BrainConnectionStatus;
    user: BrainUser | null;
    knowledgeCount: number;
    memoryCount: number;
    showBanner: boolean;
  };
}

interface AppContextValue {
  // State accessors
  mode: Accessor<AppMode>;
  screenMode: Accessor<ScreenMode>;
  interactionMode: Accessor<InteractionMode>;
  currentAgent: Accessor<string>;
  inputBuffer: Accessor<string>;
  inputCursorPosition: Accessor<number>;

  // Input ref for text insertion
  setInputInsertFn: (fn: ((text: string) => void) | null) => void;
  insertText: (text: string) => void;
  logs: Accessor<LogEntry[]>;
  currentToolCall: Accessor<ToolCall | null>;
  permissionRequest: Accessor<PermissionRequest | null>;
  learningPrompt: Accessor<LearningPrompt | null>;
  thinkingMessage: Accessor<string | null>;
  sessionId: Accessor<string | null>;
  provider: Accessor<string>;
  model: Accessor<string>;
  version: Accessor<string>;
  commandMenu: Accessor<CommandMenuState>;
  availableModels: Accessor<ProviderModel[]>;
  sessionStats: Accessor<SessionStats>;
  todosVisible: Accessor<boolean>;
  debugLogVisible: Accessor<boolean>;
  interruptPending: Accessor<boolean>;
  exitPending: Accessor<boolean>;
  isCompacting: Accessor<boolean>;
  streamingLog: Accessor<StreamingLogState>;
  streamingLogId: Accessor<string | null>;
  streamingLogContent: Accessor<string>;
  streamingLogIsActive: Accessor<boolean>;
  suggestions: Accessor<SuggestionState>;
  cascadeEnabled: Accessor<boolean>;
  brain: Accessor<{
    status: BrainConnectionStatus;
    user: BrainUser | null;
    knowledgeCount: number;
    memoryCount: number;
    showBanner: boolean;
  }>;

  // Mode actions
  setMode: (mode: AppMode) => void;
  setScreenMode: (screenMode: ScreenMode) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  toggleInteractionMode: () => void;
  setCurrentAgent: (agent: string) => void;

  // Input actions
  setInputBuffer: (buffer: string) => void;
  setInputCursorPosition: (position: number) => void;
  appendToInput: (text: string) => void;
  clearInput: () => void;

  // Log actions
  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => string;
  updateLog: (id: string, updates: Partial<LogEntry>) => void;
  clearLogs: () => void;

  // Tool call actions
  setCurrentToolCall: (toolCall: ToolCall | null) => void;
  updateToolCall: (updates: Partial<ToolCall>) => void;

  // Permission actions
  setPermissionRequest: (request: PermissionRequest | null) => void;

  // Learning prompt actions
  setLearningPrompt: (prompt: LearningPrompt | null) => void;

  // Thinking message
  setThinkingMessage: (message: string | null) => void;

  // Session info
  setSessionInfo: (sessionId: string, provider: string, model: string) => void;
  setVersion: (version: string) => void;

  // Command menu actions
  openCommandMenu: () => void;
  closeCommandMenu: () => void;
  transitionFromCommandMenu: (newMode: AppMode) => void;
  setCommandFilter: (filter: string) => void;
  setCommandSelectedIndex: (index: number) => void;

  // Model actions
  setAvailableModels: (models: ProviderModel[]) => void;
  setModel: (model: string) => void;

  // Provider actions
  setProvider: (provider: string) => void;
  setCascadeEnabled: (enabled: boolean) => void;
  toggleCascadeEnabled: () => void;

  // Session stats actions
  startThinking: () => void;
  stopThinking: () => void;
  addTokens: (input: number, output: number) => void;
  resetSessionStats: () => void;
  setContextMaxTokens: (maxTokens: number) => void;

  // UI state actions
  toggleTodos: () => void;
  toggleDebugLog: () => void;
  setInterruptPending: (pending: boolean) => void;
  setExitPending: (pending: boolean) => void;
  setIsCompacting: (compacting: boolean) => void;

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

let logIdCounter = 0;
const generateLogId = (): string => `log-${++logIdCounter}-${Date.now()}`;

const createInitialSessionStats = (): SessionStats => ({
  startTime: Date.now(),
  inputTokens: 0,
  outputTokens: 0,
  thinkingStartTime: null,
  lastThinkingDuration: 0,
  contextMaxTokens: 128000, // Default, updated when model is selected
});

const createInitialStreamingState = (): StreamingLogState => ({
  logId: null,
  content: "",
  isStreaming: false,
});

const createInitialSuggestionState = (): SuggestionState => ({
  suggestions: [],
  selectedIndex: 0,
  visible: false,
});

const createInitialCommandMenu = (): CommandMenuState => ({
  isOpen: false,
  filter: "",
  selectedIndex: 0,
});

export const { provider: AppStoreProvider, use: useAppStore } =
  createSimpleContext<AppContextValue>({
    name: "AppStore",
    init: () => {
      const [store, setStore] = createStore<AppStore>({
        mode: "idle",
        screenMode: "home",
        interactionMode: "agent",
        currentAgent: "default",
        inputBuffer: "",
        inputCursorPosition: 0,
        logs: [],
        currentToolCall: null,
        permissionRequest: null,
        learningPrompt: null,
        thinkingMessage: null,
        sessionId: null,
        provider: "copilot",
        model: "",
        version: "0.1.0",
        commandMenu: createInitialCommandMenu(),
        availableModels: [],
        sessionStats: createInitialSessionStats(),
        todosVisible: true,
        debugLogVisible: false,
        interruptPending: false,
        exitPending: false,
        isCompacting: false,
        streamingLog: createInitialStreamingState(),
        suggestions: createInitialSuggestionState(),
        cascadeEnabled: true,
        brain: {
          status: "disconnected" as BrainConnectionStatus,
          user: null,
          knowledgeCount: 0,
          memoryCount: 0,
          showBanner: true,
        },
      });

      // Input insert function (set by InputArea)
      let inputInsertFn: ((text: string) => void) | null = null;

      const setInputInsertFn = (fn: ((text: string) => void) | null): void => {
        inputInsertFn = fn;
      };

      const insertText = (text: string): void => {
        if (inputInsertFn) {
          inputInsertFn(text);
        }
      };

      // State accessors
      const mode = (): AppMode => store.mode;
      const screenMode = (): ScreenMode => store.screenMode;
      const interactionMode = (): InteractionMode => store.interactionMode;
      const currentAgent = (): string => store.currentAgent;
      const inputBuffer = (): string => store.inputBuffer;
      const inputCursorPosition = (): number => store.inputCursorPosition;
      const logs = (): LogEntry[] => store.logs;
      const currentToolCall = (): ToolCall | null => store.currentToolCall;
      const permissionRequest = (): PermissionRequest | null =>
        store.permissionRequest;
      const learningPrompt = (): LearningPrompt | null => store.learningPrompt;
      const thinkingMessage = (): string | null => store.thinkingMessage;
      const sessionId = (): string | null => store.sessionId;
      const provider = (): string => store.provider;
      const model = (): string => store.model;
      const version = (): string => store.version;
      const commandMenu = (): CommandMenuState => store.commandMenu;
      const availableModels = (): ProviderModel[] => store.availableModels;
      const sessionStats = (): SessionStats => store.sessionStats;
      const todosVisible = (): boolean => store.todosVisible;
      const debugLogVisible = (): boolean => store.debugLogVisible;
      const interruptPending = (): boolean => store.interruptPending;
      const exitPending = (): boolean => store.exitPending;
      const isCompacting = (): boolean => store.isCompacting;
      const streamingLog = (): StreamingLogState => store.streamingLog;
      // Individual property accessors for fine-grained reactivity
      const streamingLogId = (): string | null => store.streamingLog.logId;
      const streamingLogContent = (): string => store.streamingLog.content;
      const streamingLogIsActive = (): boolean => store.streamingLog.isStreaming;
      const suggestions = (): SuggestionState => store.suggestions;
      const cascadeEnabled = (): boolean => store.cascadeEnabled;
      const brain = () => store.brain;

      // Mode actions
      const setMode = (newMode: AppMode): void => {
        setStore("mode", newMode);
      };

      const setScreenMode = (newScreenMode: ScreenMode): void => {
        setStore("screenMode", newScreenMode);
      };

      const setInteractionMode = (newMode: InteractionMode): void => {
        setStore("interactionMode", newMode);
      };

      const toggleInteractionMode = (): void => {
        const modeOrder: InteractionMode[] = ["agent", "ask", "code-review"];
        const currentIndex = modeOrder.indexOf(store.interactionMode);
        const nextIndex = (currentIndex + 1) % modeOrder.length;
        setStore("interactionMode", modeOrder[nextIndex]);
      };

      const setCurrentAgent = (agent: string): void => {
        setStore("currentAgent", agent);
      };

      // Input actions
      const setInputBuffer = (buffer: string): void => {
        setStore("inputBuffer", buffer);
      };

      const setInputCursorPosition = (position: number): void => {
        setStore("inputCursorPosition", position);
      };

      const appendToInput = (text: string): void => {
        const before = store.inputBuffer.slice(0, store.inputCursorPosition);
        const after = store.inputBuffer.slice(store.inputCursorPosition);
        batch(() => {
          setStore("inputBuffer", before + text + after);
          setStore(
            "inputCursorPosition",
            store.inputCursorPosition + text.length,
          );
        });
      };

      const clearInput = (): void => {
        batch(() => {
          setStore("inputBuffer", "");
          setStore("inputCursorPosition", 0);
        });
      };

      // Log actions
      const addLog = (entry: Omit<LogEntry, "id" | "timestamp">): string => {
        const newEntry: LogEntry = {
          ...entry,
          id: generateLogId(),
          timestamp: Date.now(),
        };
        setStore(
          produce((s) => {
            s.logs.push(newEntry);
          }),
        );
        return newEntry.id;
      };

      const updateLog = (id: string, updates: Partial<LogEntry>): void => {
        setStore(
          produce((s) => {
            const index = s.logs.findIndex((log) => log.id === id);
            if (index !== -1) {
              Object.assign(s.logs[index], updates);
            }
          }),
        );
      };

      const clearLogs = (): void => {
        setStore("logs", []);
      };

      // Tool call actions
      const setCurrentToolCall = (toolCall: ToolCall | null): void => {
        setStore("currentToolCall", toolCall);
      };

      const updateToolCall = (updates: Partial<ToolCall>): void => {
        if (store.currentToolCall) {
          setStore("currentToolCall", { ...store.currentToolCall, ...updates });
        }
      };

      // Permission actions
      const setPermissionRequest = (
        request: PermissionRequest | null,
      ): void => {
        setStore("permissionRequest", request);
      };

      // Learning prompt actions
      const setLearningPrompt = (prompt: LearningPrompt | null): void => {
        setStore("learningPrompt", prompt);
      };

      // Thinking message
      const setThinkingMessage = (message: string | null): void => {
        setStore("thinkingMessage", message);
      };

      // Session info
      const setSessionInfo = (
        newSessionId: string,
        newProvider: string,
        newModel: string,
      ): void => {
        batch(() => {
          setStore("sessionId", newSessionId);
          setStore("provider", newProvider);
          setStore("model", newModel);
        });
      };

      const setVersion = (newVersion: string): void => {
        setStore("version", newVersion);
      };

      // Command menu actions
      const openCommandMenu = (): void => {
        batch(() => {
          setStore("mode", "command_menu");
          setStore("commandMenu", {
            isOpen: true,
            filter: "",
            selectedIndex: 0,
          });
        });
      };

      const closeCommandMenu = (): void => {
        batch(() => {
          setStore("mode", "idle");
          setStore("commandMenu", {
            isOpen: false,
            filter: "",
            selectedIndex: 0,
          });
        });
      };

      // Close command menu and transition to a different mode (for sub-menus)
      const transitionFromCommandMenu = (newMode: AppMode): void => {
        batch(() => {
          setStore("mode", newMode);
          setStore("commandMenu", {
            isOpen: false,
            filter: "",
            selectedIndex: 0,
          });
        });
      };

      const setCommandFilter = (filter: string): void => {
        setStore("commandMenu", {
          ...store.commandMenu,
          filter,
          selectedIndex: 0,
        });
      };

      const setCommandSelectedIndex = (index: number): void => {
        setStore("commandMenu", { ...store.commandMenu, selectedIndex: index });
      };

      // Model actions
      const setAvailableModels = (models: ProviderModel[]): void => {
        setStore("availableModels", models);
      };

      const setModel = (newModel: string): void => {
        setStore("model", newModel);
      };

      // Provider actions
      const setProvider = (newProvider: string): void => {
        setStore("provider", newProvider);
      };

      const setCascadeEnabled = (enabled: boolean): void => {
        setStore("cascadeEnabled", enabled);
      };

      const toggleCascadeEnabled = (): void => {
        setStore("cascadeEnabled", !store.cascadeEnabled);
      };

      // Brain actions
      const setBrainStatus = (status: BrainConnectionStatus): void => {
        setStore("brain", { ...store.brain, status });
      };

      const setBrainUser = (user: BrainUser | null): void => {
        setStore("brain", { ...store.brain, user });
      };

      const setBrainCounts = (knowledgeCount: number, memoryCount: number): void => {
        setStore("brain", { ...store.brain, knowledgeCount, memoryCount });
      };

      const setBrainShowBanner = (showBanner: boolean): void => {
        setStore("brain", { ...store.brain, showBanner });
      };

      const dismissBrainBanner = (): void => {
        setStore("brain", { ...store.brain, showBanner: false });
      };

      // Session stats actions
      const startThinking = (): void => {
        setStore("sessionStats", {
          ...store.sessionStats,
          thinkingStartTime: Date.now(),
        });
      };

      const stopThinking = (): void => {
        const duration = store.sessionStats.thinkingStartTime
          ? Math.floor(
              (Date.now() - store.sessionStats.thinkingStartTime) / 1000,
            )
          : 0;
        setStore("sessionStats", {
          ...store.sessionStats,
          thinkingStartTime: null,
          lastThinkingDuration: duration,
        });
      };

      const addTokens = (input: number, output: number): void => {
        setStore("sessionStats", {
          ...store.sessionStats,
          inputTokens: store.sessionStats.inputTokens + input,
          outputTokens: store.sessionStats.outputTokens + output,
        });
      };

      const resetSessionStats = (): void => {
        setStore("sessionStats", createInitialSessionStats());
      };

      const setContextMaxTokens = (maxTokens: number): void => {
        setStore("sessionStats", {
          ...store.sessionStats,
          contextMaxTokens: maxTokens,
        });
      };

      // UI state actions
      const toggleTodos = (): void => {
        setStore("todosVisible", !store.todosVisible);
      };

      const toggleDebugLog = (): void => {
        setStore("debugLogVisible", !store.debugLogVisible);
      };

      const setInterruptPending = (pending: boolean): void => {
        setStore("interruptPending", pending);
      };

      const setExitPending = (pending: boolean): void => {
        setStore("exitPending", pending);
      };

      const setIsCompacting = (compacting: boolean): void => {
        setStore("isCompacting", compacting);
      };

      // Streaming actions
      const startStreaming = (): string => {
        const logId = generateLogId();
        const entry: LogEntry = {
          id: logId,
          type: "assistant_streaming",
          content: "",
          timestamp: Date.now(),
          metadata: { isStreaming: true, streamComplete: false },
        };
        batch(() => {
          setStore(
            produce((s) => {
              s.logs.push(entry);
            }),
          );
          // Use path-based updates to ensure proper proxy reactivity
          setStore("streamingLog", "logId", logId);
          setStore("streamingLog", "content", "");
          setStore("streamingLog", "isStreaming", true);
        });
        return logId;
      };

      const appendStreamContent = (content: string): void => {
        const logId = store.streamingLog.logId;
        const isCurrentlyStreaming = store.streamingLog.isStreaming;
        if (!logId || !isCurrentlyStreaming) {
          return;
        }

        const newContent = store.streamingLog.content + content;
        const logIndex = store.logs.findIndex((l) => l.id === logId);

        batch(() => {
          // Use path-based updates for proper reactivity tracking
          setStore("streamingLog", "content", newContent);
          if (logIndex !== -1) {
            setStore("logs", logIndex, "content", newContent);
          }
        });
      };

      const completeStreaming = (): void => {
        if (!store.streamingLog.logId) {
          return;
        }

        const logId = store.streamingLog.logId;
        const logIndex = store.logs.findIndex((l) => l.id === logId);

        batch(() => {
          setStore("streamingLog", createInitialStreamingState());
          if (logIndex !== -1) {
            const currentMetadata = store.logs[logIndex].metadata ?? {};
            setStore("logs", logIndex, "type", "assistant");
            setStore("logs", logIndex, "metadata", {
              ...currentMetadata,
              isStreaming: false,
              streamComplete: true,
            });
          }
        });
      };

      const cancelStreaming = (): void => {
        if (!store.streamingLog.logId) {
          return;
        }

        const logId = store.streamingLog.logId;
        batch(() => {
          setStore("streamingLog", createInitialStreamingState());
          setStore(
            produce((s) => {
              s.logs = s.logs.filter((l) => l.id !== logId);
            }),
          );
        });
      };

      // Suggestion actions
      const setSuggestions = (newSuggestions: SuggestionPrompt[]): void => {
        setStore("suggestions", {
          suggestions: newSuggestions,
          selectedIndex: 0,
          visible: newSuggestions.length > 0,
        });
      };

      const clearSuggestions = (): void => {
        setStore("suggestions", createInitialSuggestionState());
      };

      const selectSuggestion = (index: number): void => {
        setStore("suggestions", {
          ...store.suggestions,
          selectedIndex: Math.max(
            0,
            Math.min(index, store.suggestions.suggestions.length - 1),
          ),
        });
      };

      const nextSuggestion = (): void => {
        setStore("suggestions", {
          ...store.suggestions,
          selectedIndex:
            (store.suggestions.selectedIndex + 1) %
            Math.max(1, store.suggestions.suggestions.length),
        });
      };

      const prevSuggestion = (): void => {
        const newIndex =
          store.suggestions.selectedIndex === 0
            ? Math.max(0, store.suggestions.suggestions.length - 1)
            : store.suggestions.selectedIndex - 1;
        setStore("suggestions", {
          ...store.suggestions,
          selectedIndex: newIndex,
        });
      };

      const hideSuggestions = (): void => {
        setStore("suggestions", { ...store.suggestions, visible: false });
      };

      const showSuggestions = (): void => {
        setStore("suggestions", {
          ...store.suggestions,
          visible: store.suggestions.suggestions.length > 0,
        });
      };

      // Computed
      const isInputLocked = (): boolean => {
        return (
          store.mode === "thinking" ||
          store.mode === "tool_execution" ||
          store.mode === "permission_prompt"
        );
      };

      return {
        // State accessors
        mode,
        screenMode,
        interactionMode,
        currentAgent,
        inputBuffer,
        inputCursorPosition,
        logs,
        currentToolCall,
        permissionRequest,
        learningPrompt,
        thinkingMessage,
        sessionId,
        provider,
        model,
        version,
        commandMenu,
        availableModels,
        sessionStats,
        todosVisible,
        debugLogVisible,
        interruptPending,
        exitPending,
        isCompacting,
        streamingLog,
        streamingLogId,
        streamingLogContent,
        streamingLogIsActive,
        suggestions,
        cascadeEnabled,
        brain,

        // Mode actions
        setMode,
        setScreenMode,
        setInteractionMode,
        toggleInteractionMode,
        setCurrentAgent,

        // Input actions
        setInputBuffer,
        setInputCursorPosition,
        appendToInput,
        clearInput,
        setInputInsertFn,
        insertText,

        // Log actions
        addLog,
        updateLog,
        clearLogs,

        // Tool call actions
        setCurrentToolCall,
        updateToolCall,

        // Permission actions
        setPermissionRequest,

        // Learning prompt actions
        setLearningPrompt,

        // Thinking message
        setThinkingMessage,

        // Session info
        setSessionInfo,
        setVersion,

        // Command menu actions
        openCommandMenu,
        closeCommandMenu,
        transitionFromCommandMenu,
        setCommandFilter,
        setCommandSelectedIndex,

        // Model actions
        setAvailableModels,
        setModel,

        // Provider actions
        setProvider,
        setCascadeEnabled,
        toggleCascadeEnabled,

        // Brain actions
        setBrainStatus,
        setBrainUser,
        setBrainCounts,
        setBrainShowBanner,
        dismissBrainBanner,

        // Session stats actions
        startThinking,
        stopThinking,
        addTokens,
        resetSessionStats,
        setContextMaxTokens,

        // UI state actions
        toggleTodos,
        toggleDebugLog,
        setInterruptPending,
        setExitPending,
        setIsCompacting,

        // Streaming actions
        startStreaming,
        appendStreamContent,
        completeStreaming,
        cancelStreaming,

        // Suggestion actions
        setSuggestions,
        clearSuggestions,
        selectSuggestion,
        nextSuggestion,
        prevSuggestion,
        hideSuggestions,
        showSuggestions,

        // Computed
        isInputLocked,
      };
    },
  });

// Non-reactive store access for use outside components
let storeRef: AppContextValue | null = null;

export const setAppStoreRef = (store: AppContextValue): void => {
  storeRef = store;
};

// Default state for when store is not yet initialized
const defaultAppState = {
  mode: "idle" as AppMode,
  screenMode: "home" as ScreenMode,
  interactionMode: "agent" as InteractionMode,
  currentAgent: "default",
  inputBuffer: "",
  logs: [] as LogEntry[],
  currentToolCall: null,
  permissionRequest: null,
  learningPrompt: null,
  thinkingMessage: null,
  sessionId: null,
  provider: "copilot",
  model: "",
  version: "0.1.0",
  sessionStats: createInitialSessionStats(),
  cascadeEnabled: true,
  todosVisible: true,
  debugLogVisible: false,
  interruptPending: false,
  exitPending: false,
  isCompacting: false,
  streamingLog: createInitialStreamingState(),
  suggestions: createInitialSuggestionState(),
  brain: {
    status: "disconnected" as BrainConnectionStatus,
    user: null,
    knowledgeCount: 0,
    memoryCount: 0,
    showBanner: true,
  },
};

export const appStore = {
  getState: () => {
    if (!storeRef) {
      // Return default state when store is not yet initialized
      return defaultAppState;
    }
    return {
      mode: storeRef.mode(),
      screenMode: storeRef.screenMode(),
      interactionMode: storeRef.interactionMode(),
      currentAgent: storeRef.currentAgent(),
      inputBuffer: storeRef.inputBuffer(),
      logs: storeRef.logs(),
      currentToolCall: storeRef.currentToolCall(),
      permissionRequest: storeRef.permissionRequest(),
      learningPrompt: storeRef.learningPrompt(),
      thinkingMessage: storeRef.thinkingMessage(),
      sessionId: storeRef.sessionId(),
      provider: storeRef.provider(),
      model: storeRef.model(),
      version: storeRef.version(),
      sessionStats: storeRef.sessionStats(),
      cascadeEnabled: storeRef.cascadeEnabled(),
      todosVisible: storeRef.todosVisible(),
      debugLogVisible: storeRef.debugLogVisible(),
      interruptPending: storeRef.interruptPending(),
      exitPending: storeRef.exitPending(),
      isCompacting: storeRef.isCompacting(),
      streamingLog: storeRef.streamingLog(),
      suggestions: storeRef.suggestions(),
      brain: storeRef.brain(),
    };
  },

  addLog: (entry: Omit<LogEntry, "id" | "timestamp">): string => {
    if (!storeRef) return "";
    return storeRef.addLog(entry);
  },

  updateLog: (id: string, updates: Partial<LogEntry>): void => {
    if (!storeRef) return;
    storeRef.updateLog(id, updates);
  },

  setMode: (mode: AppMode): void => {
    if (!storeRef) return;
    storeRef.setMode(mode);
  },

  toggleInteractionMode: (): void => {
    if (!storeRef) return;
    storeRef.toggleInteractionMode();
  },

  setCurrentAgent: (agent: string): void => {
    if (!storeRef) return;
    storeRef.setCurrentAgent(agent);
  },

  setCurrentToolCall: (toolCall: ToolCall | null): void => {
    if (!storeRef) return;
    storeRef.setCurrentToolCall(toolCall);
  },

  updateToolCall: (updates: Partial<ToolCall>): void => {
    if (!storeRef) return;
    storeRef.updateToolCall(updates);
  },

  setThinkingMessage: (message: string | null): void => {
    if (!storeRef) return;
    storeRef.setThinkingMessage(message);
  },

  setPermissionRequest: (request: PermissionRequest | null): void => {
    if (!storeRef) return;
    storeRef.setPermissionRequest(request);
  },

  setLearningPrompt: (prompt: LearningPrompt | null): void => {
    if (!storeRef) return;
    storeRef.setLearningPrompt(prompt);
  },

  clearInput: (): void => {
    if (!storeRef) return;
    storeRef.clearInput();
  },

  clearLogs: (): void => {
    if (!storeRef) return;
    storeRef.clearLogs();
  },

  openCommandMenu: (): void => {
    if (!storeRef) return;
    storeRef.openCommandMenu();
  },

  closeCommandMenu: (): void => {
    if (!storeRef) return;
    storeRef.closeCommandMenu();
  },

  transitionFromCommandMenu: (newMode: AppMode): void => {
    if (!storeRef) return;
    storeRef.transitionFromCommandMenu(newMode);
  },

  setAvailableModels: (models: ProviderModel[]): void => {
    if (!storeRef) return;
    storeRef.setAvailableModels(models);
  },

  setModel: (model: string): void => {
    if (!storeRef) return;
    storeRef.setModel(model);
  },

  startThinking: (): void => {
    if (!storeRef) return;
    storeRef.startThinking();
  },

  stopThinking: (): void => {
    if (!storeRef) return;
    storeRef.stopThinking();
  },

  addTokens: (input: number, output: number): void => {
    if (!storeRef) return;
    storeRef.addTokens(input, output);
  },

  resetSessionStats: (): void => {
    if (!storeRef) return;
    storeRef.resetSessionStats();
  },

  setContextMaxTokens: (maxTokens: number): void => {
    if (!storeRef) return;
    storeRef.setContextMaxTokens(maxTokens);
  },

  toggleTodos: (): void => {
    if (!storeRef) return;
    storeRef.toggleTodos();
  },

  toggleDebugLog: (): void => {
    if (!storeRef) return;
    storeRef.toggleDebugLog();
  },

  setInterruptPending: (pending: boolean): void => {
    if (!storeRef) return;
    storeRef.setInterruptPending(pending);
  },

  setIsCompacting: (compacting: boolean): void => {
    if (!storeRef) return;
    storeRef.setIsCompacting(compacting);
  },

  startStreaming: (): string => {
    if (!storeRef) return "";
    return storeRef.startStreaming();
  },

  appendStreamContent: (content: string): void => {
    if (!storeRef) return;
    storeRef.appendStreamContent(content);
  },

  completeStreaming: (): void => {
    if (!storeRef) return;
    storeRef.completeStreaming();
  },

  cancelStreaming: (): void => {
    if (!storeRef) return;
    storeRef.cancelStreaming();
  },

  setSuggestions: (suggestions: SuggestionPrompt[]): void => {
    if (!storeRef) return;
    storeRef.setSuggestions(suggestions);
  },

  clearSuggestions: (): void => {
    if (!storeRef) return;
    storeRef.clearSuggestions();
  },

  hideSuggestions: (): void => {
    if (!storeRef) return;
    storeRef.hideSuggestions();
  },

  setProvider: (provider: string): void => {
    if (!storeRef) return;
    storeRef.setProvider(provider);
  },

  setCascadeEnabled: (enabled: boolean): void => {
    if (!storeRef) return;
    storeRef.setCascadeEnabled(enabled);
  },

  toggleCascadeEnabled: (): void => {
    if (!storeRef) return;
    storeRef.toggleCascadeEnabled();
  },

  setBrainStatus: (status: BrainConnectionStatus): void => {
    if (!storeRef) return;
    storeRef.setBrainStatus(status);
  },

  setBrainUser: (user: BrainUser | null): void => {
    if (!storeRef) return;
    storeRef.setBrainUser(user);
  },

  setBrainCounts: (knowledge: number, memory: number): void => {
    if (!storeRef) return;
    storeRef.setBrainCounts(knowledge, memory);
  },

  setBrainShowBanner: (show: boolean): void => {
    if (!storeRef) return;
    storeRef.setBrainShowBanner(show);
  },

  dismissBrainBanner: (): void => {
    if (!storeRef) return;
    storeRef.dismissBrainBanner();
  },
};
