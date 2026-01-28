/**
 * Application State Management with Zustand
 */

import { create } from "zustand";
import type {
  AppState,
  AppMode,
  ScreenMode,
  LogEntry,
  ToolCall,
  PermissionRequest,
  LearningPrompt,
  SessionStats,
  StreamingLogState,
  SuggestionState,
  SuggestionPrompt,
} from "@/types/tui";
import type { ProviderModel } from "@/types/providers";

const createInitialSessionStats = (): SessionStats => ({
  startTime: Date.now(),
  inputTokens: 0,
  outputTokens: 0,
  thinkingStartTime: null,
  lastThinkingDuration: 0,
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

let logIdCounter = 0;

const generateLogId = (): string => {
  return `log-${++logIdCounter}-${Date.now()}`;
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  mode: "idle",
  screenMode: "home",
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
  commandMenu: {
    isOpen: false,
    filter: "",
    selectedIndex: 0,
  },
  availableModels: [],
  sessionStats: createInitialSessionStats(),
  todosVisible: true,
  interruptPending: false,
  exitPending: false,
  isCompacting: false,
  scrollOffset: 0,
  autoScroll: true,
  userScrolled: false,
  isSettling: false,
  totalLines: 0,
  visibleHeight: 20,
  streamingLog: createInitialStreamingState(),
  suggestions: createInitialSuggestionState(),

  // Mode actions
  setMode: (mode: AppMode) => set({ mode }),
  setScreenMode: (screenMode: ScreenMode) => set({ screenMode }),

  // Input actions
  setInputBuffer: (buffer: string) => set({ inputBuffer: buffer }),
  setInputCursorPosition: (position: number) =>
    set({ inputCursorPosition: position }),

  appendToInput: (text: string) => {
    const { inputBuffer, inputCursorPosition } = get();
    const before = inputBuffer.slice(0, inputCursorPosition);
    const after = inputBuffer.slice(inputCursorPosition);
    set({
      inputBuffer: before + text + after,
      inputCursorPosition: inputCursorPosition + text.length,
    });
  },

  clearInput: () => set({ inputBuffer: "", inputCursorPosition: 0 }),

  // Log actions
  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => {
    const newEntry: LogEntry = {
      ...entry,
      id: generateLogId(),
      timestamp: Date.now(),
    };
    set((state) => ({ logs: [...state.logs, newEntry] }));
    return newEntry.id;
  },

  updateLog: (id: string, updates: Partial<LogEntry>) => {
    set((state) => ({
      logs: state.logs.map((log) =>
        log.id === id ? { ...log, ...updates } : log,
      ),
    }));
  },

  clearLogs: () => set({ logs: [] }),

  // Tool call actions
  setCurrentToolCall: (toolCall: ToolCall | null) =>
    set({ currentToolCall: toolCall }),

  updateToolCall: (updates: Partial<ToolCall>) => {
    set((state) => ({
      currentToolCall: state.currentToolCall
        ? { ...state.currentToolCall, ...updates }
        : null,
    }));
  },

  // Permission actions
  setPermissionRequest: (request: PermissionRequest | null) =>
    set({ permissionRequest: request }),

  // Learning prompt actions
  setLearningPrompt: (prompt: LearningPrompt | null) =>
    set({ learningPrompt: prompt }),

  // Thinking message
  setThinkingMessage: (message: string | null) =>
    set({ thinkingMessage: message }),

  // Session info
  setSessionInfo: (sessionId: string, provider: string, model: string) =>
    set({ sessionId, provider, model }),

  setVersion: (version: string) => set({ version }),

  // Command menu actions
  openCommandMenu: () =>
    set({
      mode: "command_menu",
      commandMenu: { isOpen: true, filter: "", selectedIndex: 0 },
    }),

  closeCommandMenu: () =>
    set({
      mode: "idle",
      commandMenu: { isOpen: false, filter: "", selectedIndex: 0 },
    }),

  setCommandFilter: (filter: string) =>
    set((state) => ({
      commandMenu: { ...state.commandMenu, filter, selectedIndex: 0 },
    })),

  setCommandSelectedIndex: (index: number) =>
    set((state) => ({
      commandMenu: { ...state.commandMenu, selectedIndex: index },
    })),

  // Model actions
  setAvailableModels: (models: ProviderModel[]) =>
    set({ availableModels: models }),

  setModel: (model: string) => set({ model }),

  // Session stats actions
  startThinking: () =>
    set((state) => ({
      sessionStats: {
        ...state.sessionStats,
        thinkingStartTime: Date.now(),
      },
    })),

  stopThinking: () =>
    set((state) => {
      const duration = state.sessionStats.thinkingStartTime
        ? Math.floor((Date.now() - state.sessionStats.thinkingStartTime) / 1000)
        : 0;
      return {
        sessionStats: {
          ...state.sessionStats,
          thinkingStartTime: null,
          lastThinkingDuration: duration,
        },
      };
    }),

  addTokens: (input: number, output: number) =>
    set((state) => ({
      sessionStats: {
        ...state.sessionStats,
        inputTokens: state.sessionStats.inputTokens + input,
        outputTokens: state.sessionStats.outputTokens + output,
      },
    })),

  resetSessionStats: () => set({ sessionStats: createInitialSessionStats() }),

  // UI state actions
  toggleTodos: () => set((state) => ({ todosVisible: !state.todosVisible })),

  setInterruptPending: (pending: boolean) => set({ interruptPending: pending }),

  setExitPending: (pending: boolean) => set({ exitPending: pending }),

  setIsCompacting: (compacting: boolean) => set({ isCompacting: compacting }),

  // Scroll actions
  scrollUp: (lines = 3) =>
    set((state) => {
      const newOffset = Math.max(0, state.scrollOffset - lines);
      return {
        scrollOffset: newOffset,
        autoScroll: false,
        userScrolled: true,
      };
    }),

  scrollDown: (lines = 3) =>
    set((state) => {
      const maxScroll = Math.max(0, state.totalLines - state.visibleHeight);
      const newOffset = Math.min(maxScroll, state.scrollOffset + lines);
      const distanceFromBottom = maxScroll - newOffset;
      const isAtBottom = distanceFromBottom <= 3;

      return {
        scrollOffset: newOffset,
        autoScroll: isAtBottom,
        userScrolled: !isAtBottom,
      };
    }),

  scrollToTop: () =>
    set({
      scrollOffset: 0,
      autoScroll: false,
      userScrolled: true,
    }),

  scrollToBottom: () =>
    set((state) => {
      const maxScroll = Math.max(0, state.totalLines - state.visibleHeight);
      return {
        scrollOffset: maxScroll,
        autoScroll: true,
        userScrolled: false,
      };
    }),

  setAutoScroll: (enabled: boolean) => set({ autoScroll: enabled }),

  setUserScrolled: (scrolled: boolean) =>
    set({
      userScrolled: scrolled,
      autoScroll: !scrolled,
    }),

  setScrollDimensions: (totalLines: number, visibleHeight: number) =>
    set((state) => {
      const maxScroll = Math.max(0, totalLines - visibleHeight);
      // If auto-scroll is enabled, keep scroll at bottom
      const newOffset = state.autoScroll
        ? maxScroll
        : Math.min(state.scrollOffset, maxScroll);
      return {
        totalLines,
        visibleHeight,
        scrollOffset: newOffset,
      };
    }),

  pauseAutoScroll: () =>
    set({
      autoScroll: false,
      userScrolled: true,
    }),

  resumeAutoScroll: () =>
    set((state) => {
      const maxScroll = Math.max(0, state.totalLines - state.visibleHeight);
      return {
        autoScroll: true,
        userScrolled: false,
        scrollOffset: maxScroll,
      };
    }),

  getEffectiveScrollOffset: () => {
    const state = get();
    const maxScroll = Math.max(0, state.totalLines - state.visibleHeight);
    if (state.autoScroll && !state.userScrolled) {
      return maxScroll;
    }
    return Math.min(state.scrollOffset, maxScroll);
  },

  // Streaming actions
  startStreaming: () => {
    const logId = generateLogId();
    const entry: LogEntry = {
      id: logId,
      type: "assistant_streaming",
      content: "",
      timestamp: Date.now(),
      metadata: { isStreaming: true, streamComplete: false },
    };
    set((state) => ({
      logs: [...state.logs, entry],
      streamingLog: {
        logId,
        content: "",
        isStreaming: true,
      },
    }));
    return logId;
  },

  appendStreamContent: (content: string) => {
    set((state) => {
      if (!state.streamingLog.logId || !state.streamingLog.isStreaming) {
        return state;
      }

      const newContent = state.streamingLog.content + content;

      return {
        streamingLog: {
          ...state.streamingLog,
          content: newContent,
        },
        logs: state.logs.map((log) =>
          log.id === state.streamingLog.logId
            ? { ...log, content: newContent }
            : log,
        ),
      };
    });
  },

  completeStreaming: () => {
    set((state) => {
      if (!state.streamingLog.logId) {
        return state;
      }

      return {
        streamingLog: createInitialStreamingState(),
        logs: state.logs.map((log) =>
          log.id === state.streamingLog.logId
            ? {
                ...log,
                type: "assistant" as const,
                metadata: {
                  ...log.metadata,
                  isStreaming: false,
                  streamComplete: true,
                },
              }
            : log,
        ),
      };
    });
  },

  cancelStreaming: () => {
    set((state) => {
      if (!state.streamingLog.logId) {
        return state;
      }

      // Remove the streaming log entry if cancelled
      return {
        streamingLog: createInitialStreamingState(),
        logs: state.logs.filter((log) => log.id !== state.streamingLog.logId),
      };
    });
  },

  // Suggestion actions
  setSuggestions: (newSuggestions: SuggestionPrompt[]) =>
    set({
      suggestions: {
        suggestions: newSuggestions,
        selectedIndex: 0,
        visible: newSuggestions.length > 0,
      },
    }),

  clearSuggestions: () => set({ suggestions: createInitialSuggestionState() }),

  selectSuggestion: (index: number) =>
    set((state) => ({
      suggestions: {
        ...state.suggestions,
        selectedIndex: Math.max(
          0,
          Math.min(index, state.suggestions.suggestions.length - 1),
        ),
      },
    })),

  nextSuggestion: () =>
    set((state) => ({
      suggestions: {
        ...state.suggestions,
        selectedIndex:
          (state.suggestions.selectedIndex + 1) %
          Math.max(1, state.suggestions.suggestions.length),
      },
    })),

  prevSuggestion: () =>
    set((state) => ({
      suggestions: {
        ...state.suggestions,
        selectedIndex:
          state.suggestions.selectedIndex === 0
            ? Math.max(0, state.suggestions.suggestions.length - 1)
            : state.suggestions.selectedIndex - 1,
      },
    })),

  hideSuggestions: () =>
    set((state) => ({
      suggestions: { ...state.suggestions, visible: false },
    })),

  showSuggestions: () =>
    set((state) => ({
      suggestions: {
        ...state.suggestions,
        visible: state.suggestions.suggestions.length > 0,
      },
    })),

  // Computed - check if input should be locked
  isInputLocked: () => {
    const { mode } = get();
    return (
      mode === "thinking" ||
      mode === "tool_execution" ||
      mode === "permission_prompt"
    );
  },
}));

// Non-React access to store (for use in agent callbacks)
export const appStore = {
  getState: () => useAppStore.getState(),

  addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => {
    return useAppStore.getState().addLog(entry);
  },

  updateLog: (id: string, updates: Partial<LogEntry>) => {
    useAppStore.getState().updateLog(id, updates);
  },

  setMode: (mode: AppMode) => {
    useAppStore.getState().setMode(mode);
  },

  setCurrentToolCall: (toolCall: ToolCall | null) => {
    useAppStore.getState().setCurrentToolCall(toolCall);
  },

  updateToolCall: (updates: Partial<ToolCall>) => {
    useAppStore.getState().updateToolCall(updates);
  },

  setThinkingMessage: (message: string | null) => {
    useAppStore.getState().setThinkingMessage(message);
  },

  setPermissionRequest: (request: PermissionRequest | null) => {
    useAppStore.getState().setPermissionRequest(request);
  },

  setLearningPrompt: (prompt: LearningPrompt | null) => {
    useAppStore.getState().setLearningPrompt(prompt);
  },

  clearInput: () => {
    useAppStore.getState().clearInput();
  },

  clearLogs: () => {
    useAppStore.getState().clearLogs();
  },

  openCommandMenu: () => {
    useAppStore.getState().openCommandMenu();
  },

  closeCommandMenu: () => {
    useAppStore.getState().closeCommandMenu();
  },

  setAvailableModels: (models: ProviderModel[]) => {
    useAppStore.getState().setAvailableModels(models);
  },

  setModel: (model: string) => {
    useAppStore.getState().setModel(model);
  },

  // Session stats
  startThinking: () => {
    useAppStore.getState().startThinking();
  },

  stopThinking: () => {
    useAppStore.getState().stopThinking();
  },

  addTokens: (input: number, output: number) => {
    useAppStore.getState().addTokens(input, output);
  },

  resetSessionStats: () => {
    useAppStore.getState().resetSessionStats();
  },

  // UI state
  toggleTodos: () => {
    useAppStore.getState().toggleTodos();
  },

  setInterruptPending: (pending: boolean) => {
    useAppStore.getState().setInterruptPending(pending);
  },

  setIsCompacting: (compacting: boolean) => {
    useAppStore.getState().setIsCompacting(compacting);
  },

  // Streaming
  startStreaming: () => {
    return useAppStore.getState().startStreaming();
  },

  appendStreamContent: (content: string) => {
    useAppStore.getState().appendStreamContent(content);
  },

  completeStreaming: () => {
    useAppStore.getState().completeStreaming();
  },

  cancelStreaming: () => {
    useAppStore.getState().cancelStreaming();
  },

  // Suggestions
  setSuggestions: (suggestions: SuggestionPrompt[]) => {
    useAppStore.getState().setSuggestions(suggestions);
  },

  clearSuggestions: () => {
    useAppStore.getState().clearSuggestions();
  },

  hideSuggestions: () => {
    useAppStore.getState().hideSuggestions();
  },

  // Scroll
  scrollUp: (lines?: number) => {
    useAppStore.getState().scrollUp(lines);
  },

  scrollDown: (lines?: number) => {
    useAppStore.getState().scrollDown(lines);
  },

  scrollToTop: () => {
    useAppStore.getState().scrollToTop();
  },

  scrollToBottom: () => {
    useAppStore.getState().scrollToBottom();
  },

  pauseAutoScroll: () => {
    useAppStore.getState().pauseAutoScroll();
  },

  resumeAutoScroll: () => {
    useAppStore.getState().resumeAutoScroll();
  },
};
