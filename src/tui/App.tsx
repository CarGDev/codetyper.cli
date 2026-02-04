/**
 * Main TUI Application Component
 */

import React, {
  useEffect,
  useCallback,
  useState,
  useRef,
  useMemo,
} from "react";
import { Box, useApp, useInput, Text } from "ink";
import { useAppStore } from "@tui/store";
import {
  LogPanel,
  PermissionModal,
  LearningModal,
  StatusBar,
  CommandMenu,
  ModelSelect,
  AgentSelect,
  ThemeSelect,
  MCPSelect,
  MCPBrowser,
  TodoPanel,
  FilePicker,
  SessionHeader,
} from "@tui/components/index";
import { InputLine, calculateLineStartPos } from "@tui/components/input-line";
import { useThemeStore, useThemeColors } from "@tui/hooks/useThemeStore";
import type { AgentConfig } from "@/types/agent-config";
import { createFilePickerState } from "@/services/file-picker-service";
import { INTERRUPT_TIMEOUT } from "@constants/ui";
import type { AppProps } from "@interfaces/AppProps";
import {
  isMouseEscapeSequence,
  cleanInput,
  insertAtCursor,
  deleteBeforeCursor,
  calculateCursorPosition,
} from "@utils/tui-app/input-utils";

import {
  isInputLocked,
  isModalCommand,
  isMainInputActive as checkMainInputActive,
  isProcessing,
} from "@utils/tui-app/mode-utils";

import {
  shouldSummarizePaste,
  addPastedBlock,
  updatePastedBlocksAfterDelete,
  expandPastedContent,
  normalizeLineEndings,
  clearPastedBlocks,
} from "@utils/tui-app/paste-utils";

import { PAGE_SCROLL_LINES, MOUSE_SCROLL_LINES } from "@constants/auto-scroll";
import { useMouseScroll } from "@tui/hooks";
import type { PasteState } from "@interfaces/PastedContent";
import { createInitialPasteState } from "@interfaces/PastedContent";
import { readClipboardImage } from "@services/clipboard-service";
import { ImageAttachment } from "@tui/components/ImageAttachment";

// Re-export for backwards compatibility
export type { AppProps } from "@interfaces/AppProps";

export function App({
  sessionId,
  provider,
  model,
  agent = "coder",
  version,
  onSubmit,
  onExit,
  onCommand,
  onModelSelect,
  onAgentSelect,
  onThemeSelect,
}: AppProps): React.ReactElement {
  const { exit } = useApp();
  const setSessionInfo = useAppStore((state) => state.setSessionInfo);
  const setMode = useAppStore((state) => state.setMode);
  const addLog = useAppStore((state) => state.addLog);
  const mode = useAppStore((state) => state.mode);
  const permissionRequest = useAppStore((state) => state.permissionRequest);
  const learningPrompt = useAppStore((state) => state.learningPrompt);
  const openCommandMenu = useAppStore((state) => state.openCommandMenu);
  const closeCommandMenu = useAppStore((state) => state.closeCommandMenu);
  const interruptPending = useAppStore((state) => state.interruptPending);
  const setInterruptPending = useAppStore((state) => state.setInterruptPending);
  const exitPending = useAppStore((state) => state.exitPending);
  const setExitPending = useAppStore((state) => state.setExitPending);
  const toggleTodos = useAppStore((state) => state.toggleTodos);
  const toggleInteractionMode = useAppStore(
    (state) => state.toggleInteractionMode,
  );
  const interactionMode = useAppStore((state) => state.interactionMode);
  const startThinking = useAppStore((state) => state.startThinking);
  const stopThinking = useAppStore((state) => state.stopThinking);
  const scrollUp = useAppStore((state) => state.scrollUp);
  const scrollDown = useAppStore((state) => state.scrollDown);
  const scrollToTop = useAppStore((state) => state.scrollToTop);
  const scrollToBottom = useAppStore((state) => state.scrollToBottom);
  const screenMode = useAppStore((state) => state.screenMode);
  const setScreenMode = useAppStore((state) => state.setScreenMode);
  const sessionStats = useAppStore((state) => state.sessionStats);
  const brain = useAppStore((state) => state.brain);
  const dismissBrainBanner = useAppStore((state) => state.dismissBrainBanner);

  // Local input state
  const [inputBuffer, setInputBuffer] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  // Paste state for virtual text
  const [pasteState, setPasteState] = useState<PasteState>(
    createInitialPasteState,
  );

  // File picker state
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [filePickerQuery, setFilePickerQuery] = useState("");
  const [filePickerTrigger, setFilePickerTrigger] = useState<"@" | "/">("@");
  const filePickerState = useMemo(
    () => createFilePickerState(process.cwd()),
    [],
  );

  // Interrupt timeout ref
  const interruptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Exit timeout ref
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLocked = isInputLocked(mode);
  const isCommandMenuOpen = mode === "command_menu";
  const isModelSelectOpen = mode === "model_select";
  const isAgentSelectOpen = mode === "agent_select";
  const isThemeSelectOpen = mode === "theme_select";
  const isMCPSelectOpen = mode === "mcp_select";
  const isMCPBrowserOpen = mode === "mcp_browse";
  const isLearningPromptOpen = mode === "learning_prompt";

  // Theme colors
  const colors = useThemeColors();
  const setTheme = useThemeStore((state) => state.setTheme);

  // Mouse scroll handling - scroll up pauses auto-scroll, scroll down toward bottom resumes
  useMouseScroll({
    onScrollUp: () => scrollUp(MOUSE_SCROLL_LINES),
    onScrollDown: () => scrollDown(MOUSE_SCROLL_LINES),
    enabled: true,
  });

  // Main input should only be active when not in special modes
  const mainInputActive =
    checkMainInputActive(mode, isLocked) && !filePickerOpen;

  // Initialize session info
  useEffect(() => {
    setSessionInfo(sessionId, provider, model);
  }, [sessionId, provider, model, setSessionInfo]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (interruptTimeoutRef.current) {
        clearTimeout(interruptTimeoutRef.current);
      }
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, []);

  // Handle message submission
  const handleSubmit = useCallback(
    async (message: string) => {
      // Expand pasted content before submitting
      const expandedMessage = expandPastedContent(
        message,
        pasteState.pastedBlocks,
      );

      // Capture images before clearing
      const images =
        pasteState.pastedImages.length > 0
          ? [...pasteState.pastedImages]
          : undefined;

      // Clear paste state after expanding
      setPasteState(clearPastedBlocks());

      // Transition to session view when first message is sent
      if (screenMode === "home") {
        setScreenMode("session");
      }

      // Build log content with image indicator
      const logContent = images
        ? `${expandedMessage}\n[${images.length} image${images.length > 1 ? "s" : ""} attached]`
        : expandedMessage;

      addLog({ type: "user", content: logContent });
      setMode("thinking");
      startThinking();

      try {
        await onSubmit(expandedMessage, { images });
      } finally {
        stopThinking();
        setMode("idle");
      }
    },
    [
      onSubmit,
      addLog,
      setMode,
      startThinking,
      stopThinking,
      screenMode,
      setScreenMode,
      pasteState.pastedBlocks,
      pasteState.pastedImages,
    ],
  );

  // Handle command selection from menu
  const handleCommandSelect = useCallback(
    async (command: string) => {
      closeCommandMenu();
      setInputBuffer("");
      setCursorPos(0);

      // Commands that open their own modal will set their own mode
      if (!isModalCommand(command)) {
        setMode("idle");
      }

      if (onCommand) {
        await onCommand(command);
      }
    },
    [onCommand, closeCommandMenu, setMode],
  );

  // Handle model selection
  const handleModelSelect = useCallback(
    (selectedModel: string) => {
      setMode("idle");
      if (onModelSelect) {
        onModelSelect(selectedModel);
      }
    },
    [onModelSelect, setMode],
  );

  // Handle model select close
  const handleModelSelectClose = useCallback(() => {
    setMode("idle");
  }, [setMode]);

  // Handle agent selection
  const handleAgentSelect = useCallback(
    (agentId: string, agentConfig: AgentConfig) => {
      setMode("idle");
      if (onAgentSelect) {
        onAgentSelect(agentId, agentConfig);
      }
      addLog({
        type: "system",
        content: `Switched to agent: ${agentConfig.name}${agentConfig.description ? `\n${agentConfig.description}` : ""}`,
      });
    },
    [onAgentSelect, setMode, addLog],
  );

  // Handle agent select close
  const handleAgentSelectClose = useCallback(() => {
    setMode("idle");
  }, [setMode]);

  // Handle theme selection
  const handleThemeSelect = useCallback(
    (themeName: string) => {
      setTheme(themeName);
      setMode("idle");
      if (onThemeSelect) {
        onThemeSelect(themeName);
      }
      addLog({
        type: "system",
        content: `Theme changed to: ${themeName}`,
      });
    },
    [setTheme, setMode, onThemeSelect, addLog],
  );

  // Handle theme select close
  const handleThemeSelectClose = useCallback(() => {
    setMode("idle");
  }, [setMode]);

  // Handle MCP select close
  const handleMCPSelectClose = useCallback(() => {
    setMode("idle");
  }, [setMode]);

  // Handle MCP browser close
  const handleMCPBrowserClose = useCallback(() => {
    setMode("idle");
  }, [setMode]);

  // Handle file selection from picker
  const handleFileSelect = useCallback(
    (path: string): void => {
      const fileRef = `${filePickerTrigger}${path}`;
      const { newBuffer, newCursorPos } = insertAtCursor(
        inputBuffer,
        cursorPos,
        fileRef + " ",
      );
      setInputBuffer(newBuffer);
      setCursorPos(newCursorPos);
      setFilePickerOpen(false);
      setFilePickerQuery("");
    },
    [filePickerTrigger, inputBuffer, cursorPos],
  );

  // Handle file picker cancel
  const handleFilePickerCancel = useCallback((): void => {
    setFilePickerOpen(false);
    setFilePickerQuery("");
  }, []);

  // Handle command menu cancel (Escape or backspace with no filter)
  const handleCommandMenuCancel = useCallback((): void => {
    setInputBuffer("");
    setCursorPos(0);
  }, []);

  // Handle interrupt logic
  const handleInterrupt = useCallback(() => {
    if (interruptPending) {
      // Second press - actually interrupt
      if (interruptTimeoutRef.current) {
        clearTimeout(interruptTimeoutRef.current);
        interruptTimeoutRef.current = null;
      }
      setInterruptPending(false);
      stopThinking();
      addLog({ type: "system", content: "Operation interrupted" });
      setMode("idle");
    } else {
      // First press - set pending and start timeout
      setInterruptPending(true);
      interruptTimeoutRef.current = setTimeout(() => {
        setInterruptPending(false);
        interruptTimeoutRef.current = null;
      }, INTERRUPT_TIMEOUT);
    }
  }, [interruptPending, setInterruptPending, stopThinking, addLog, setMode]);

  // Global input handler for Ctrl+C, Ctrl+D, Ctrl+T, scroll (always active)
  useInput((input, key) => {
    // Handle Ctrl+M to toggle interaction mode (Ctrl+Tab doesn't work in most terminals)
    if (key.ctrl && input === "m") {
      toggleInteractionMode();
      // Note: The log will show the new mode after toggle
      const newMode = useAppStore.getState().interactionMode;
      addLog({
        type: "system",
        content: `Switched to ${newMode} mode (Ctrl+M)`,
      });
      return;
    }

    // Handle Ctrl+T to toggle todos visibility (only in agent/code-review modes)
    if (key.ctrl && input === "t") {
      const currentMode = useAppStore.getState().interactionMode;
      if (currentMode === "agent" || currentMode === "code-review") {
        toggleTodos();
      }
      return;
    }

    // Handle Page Up/Down for scrolling (works even when locked)
    if (key.pageUp) {
      scrollUp(PAGE_SCROLL_LINES);
      return;
    }

    if (key.pageDown) {
      scrollDown(PAGE_SCROLL_LINES);
      return;
    }

    // Handle Ctrl+Home/End for scroll to top/bottom
    if (key.ctrl && key.home) {
      scrollToTop();
      return;
    }

    if (key.ctrl && key.end) {
      scrollToBottom();
      return;
    }

    // Handle Shift+Up/Down for scrolling
    if (key.shift && key.upArrow) {
      scrollUp(3);
      return;
    }

    if (key.shift && key.downArrow) {
      scrollDown(3);
      return;
    }

    // Handle Ctrl+C
    if (key.ctrl && input === "c") {
      if (isProcessing(mode)) {
        handleInterrupt();
      } else if (filePickerOpen) {
        handleFilePickerCancel();
      } else if (
        isCommandMenuOpen ||
        isModelSelectOpen ||
        isAgentSelectOpen ||
        isThemeSelectOpen ||
        isMCPSelectOpen ||
        isMCPBrowserOpen ||
        isLearningPromptOpen
      ) {
        closeCommandMenu();
        setMode("idle");
      } else if (!permissionRequest && !learningPrompt) {
        if (exitPending) {
          // Second press - actually exit
          if (exitTimeoutRef.current) {
            clearTimeout(exitTimeoutRef.current);
            exitTimeoutRef.current = null;
          }
          setExitPending(false);
          onExit();
          exit();
        } else {
          // First press - set pending and show message
          setExitPending(true);
          addLog({ type: "system", content: "Press Ctrl+C again to quit" });
          exitTimeoutRef.current = setTimeout(() => {
            setExitPending(false);
            exitTimeoutRef.current = null;
          }, INTERRUPT_TIMEOUT);
        }
      }
      return;
    }

    // Handle Ctrl+D to exit
    if (key.ctrl && input === "d") {
      if ((mode === "idle" || mode === "editing") && inputBuffer.length === 0) {
        onExit();
        exit();
      }
      return;
    }
  });

  // Main input handler - only active when in normal input mode
  useInput(
    (input, key) => {
      // Skip if this is a control sequence handled by the global handler
      if (key.ctrl && (input === "c" || input === "d" || input === "t")) {
        return;
      }

      // Handle Enter
      if (key.return) {
        if (key.meta) {
          // Alt+Enter: insert newline
          const { newBuffer, newCursorPos } = insertAtCursor(
            inputBuffer,
            cursorPos,
            "\n",
          );
          setInputBuffer(newBuffer);
          setCursorPos(newCursorPos);
        } else {
          // Plain Enter: submit
          const message = inputBuffer.trim();
          if (message) {
            handleSubmit(message);
            setInputBuffer("");
            setCursorPos(0);
            // Note: paste state is cleared in handleSubmit after expansion
          }
        }
        return;
      }

      // Handle Escape
      if (key.escape) {
        return;
      }

      // Handle backspace
      if (key.backspace || key.delete) {
        const { newBuffer, newCursorPos } = deleteBeforeCursor(
          inputBuffer,
          cursorPos,
        );
        setInputBuffer(newBuffer);
        setCursorPos(newCursorPos);

        // Update pasted block positions after deletion
        if (pasteState.pastedBlocks.size > 0) {
          const deleteLength = inputBuffer.length - newBuffer.length;
          const deletePos = newCursorPos;
          const updatedBlocks = updatePastedBlocksAfterDelete(
            pasteState.pastedBlocks,
            deletePos,
            deleteLength,
          );
          setPasteState((prev) => ({
            ...prev,
            pastedBlocks: updatedBlocks,
          }));
        }
        return;
      }

      // Handle arrow keys
      if (key.leftArrow) {
        if (cursorPos > 0) setCursorPos(cursorPos - 1);
        return;
      }

      if (key.rightArrow) {
        if (cursorPos < inputBuffer.length) setCursorPos(cursorPos + 1);
        return;
      }

      if (key.upArrow || key.downArrow) {
        return;
      }

      // Handle Ctrl shortcuts
      if (key.ctrl) {
        if (input === "u") {
          setInputBuffer("");
          setCursorPos(0);
          setPasteState(clearPastedBlocks());
        } else if (input === "a") {
          setCursorPos(0);
        } else if (input === "e") {
          setCursorPos(inputBuffer.length);
        } else if (input === "k") {
          setInputBuffer(inputBuffer.slice(0, cursorPos));
          // Update paste state for kill to end of line
          if (pasteState.pastedBlocks.size > 0) {
            const deleteLength = inputBuffer.length - cursorPos;
            const updatedBlocks = updatePastedBlocksAfterDelete(
              pasteState.pastedBlocks,
              cursorPos,
              deleteLength,
            );
            setPasteState((prev) => ({
              ...prev,
              pastedBlocks: updatedBlocks,
            }));
          }
        } else if (input === "v" || input === "\x16") {
          // Handle Ctrl+V for image paste (v or raw control character)
          readClipboardImage().then((image) => {
            if (image) {
              setPasteState((prev) => ({
                ...prev,
                pastedImages: [...prev.pastedImages, image],
              }));
              addLog({
                type: "system",
                content: `Image attached (${image.mediaType})`,
              });
            }
          });
        } else if (input === "i") {
          // Handle Ctrl+I as alternative for image paste
          readClipboardImage().then((image) => {
            if (image) {
              setPasteState((prev) => ({
                ...prev,
                pastedImages: [...prev.pastedImages, image],
              }));
              addLog({
                type: "system",
                content: `Image attached (${image.mediaType})`,
              });
            } else {
              addLog({
                type: "system",
                content: "No image found in clipboard",
              });
            }
          });
        }
        return;
      }

      // Handle Cmd+V (macOS) for image paste
      if (key.meta && (input === "v" || input === "\x16")) {
        readClipboardImage().then((image) => {
          if (image) {
            setPasteState((prev) => ({
              ...prev,
              pastedImages: [...prev.pastedImages, image],
            }));
            addLog({
              type: "system",
              content: `Image attached (${image.mediaType})`,
            });
          }
        });
        return;
      }

      // Skip meta key combinations
      if (key.meta) {
        return;
      }

      // Check for '/' at start of input to open command menu
      if (input === "/" && inputBuffer.length === 0) {
        openCommandMenu();
        setInputBuffer("/");
        setCursorPos(1);
        return;
      }

      // Check for '@' to open file picker
      if (input === "@") {
        setFilePickerTrigger("@");
        setFilePickerQuery("");
        setFilePickerOpen(true);
        return;
      }

      // Filter out mouse escape sequences
      if (isMouseEscapeSequence(input)) {
        return;
      }

      // Regular character input - only accept printable characters
      if (input && input.length > 0) {
        const cleaned = cleanInput(input);
        if (cleaned.length > 0) {
          // Normalize line endings for pasted content
          const normalizedContent = normalizeLineEndings(cleaned);

          // Check if this is a paste that should be summarized
          if (shouldSummarizePaste(normalizedContent)) {
            // Create virtual text placeholder for large paste
            const { newState, pastedContent } = addPastedBlock(
              pasteState,
              normalizedContent,
              cursorPos,
            );

            // Insert placeholder + space into buffer
            const placeholderWithSpace = pastedContent.placeholder + " ";
            const { newBuffer, newCursorPos } = insertAtCursor(
              inputBuffer,
              cursorPos,
              placeholderWithSpace,
            );

            setInputBuffer(newBuffer);
            setCursorPos(newCursorPos);
            setPasteState(newState);
          } else {
            // Normal input - insert as-is
            const { newBuffer, newCursorPos } = insertAtCursor(
              inputBuffer,
              cursorPos,
              normalizedContent,
            );
            setInputBuffer(newBuffer);
            setCursorPos(newCursorPos);
          }
        }
      }
    },
    { isActive: mainInputActive },
  );

  // Render input area inline
  const lines = inputBuffer.split("\n");
  const isEmpty = inputBuffer.length === 0;
  const { line: cursorLine, col: cursorCol } = calculateCursorPosition(
    inputBuffer,
    cursorPos,
  );

  // Calculate token count for session header
  const totalTokens = sessionStats.inputTokens + sessionStats.outputTokens;

  return (
    <Box flexDirection="column" height="100%">
      {/* Always show session header and status bar */}
      <SessionHeader
        title={sessionId ?? "New session"}
        tokenCount={totalTokens}
        contextPercentage={15}
        cost={0}
        version={version}
        interactionMode={interactionMode}
        brain={brain}
        onDismissBrainBanner={dismissBrainBanner}
      />
      <StatusBar />

      <Box flexDirection="column" flexGrow={1}>
        {/* Main content area with all panes */}
        <Box flexDirection="row" flexGrow={1}>
          <Box flexDirection="column" flexGrow={1}>
            {/* LogPanel shows logo when empty, logs otherwise */}
            <LogPanel />
          </Box>
          <TodoPanel />
        </Box>
        <PermissionModal />
        <LearningModal />

        {/* Command Menu Overlay */}
        {isCommandMenuOpen && (
          <CommandMenu
            onSelect={handleCommandSelect}
            onCancel={handleCommandMenuCancel}
            isActive={isCommandMenuOpen}
          />
        )}

        {/* Model Select Overlay */}
        {isModelSelectOpen && (
          <ModelSelect
            onSelect={handleModelSelect}
            onClose={handleModelSelectClose}
            isActive={isModelSelectOpen}
          />
        )}

        {/* Agent Select Overlay */}
        {isAgentSelectOpen && (
          <AgentSelect
            onSelect={handleAgentSelect}
            onClose={handleAgentSelectClose}
            currentAgent={agent}
            isActive={isAgentSelectOpen}
          />
        )}

        {/* Theme Select Overlay */}
        {isThemeSelectOpen && (
          <ThemeSelect
            onSelect={handleThemeSelect}
            onClose={handleThemeSelectClose}
            isActive={isThemeSelectOpen}
          />
        )}

        {/* MCP Select Overlay */}
        {isMCPSelectOpen && (
          <MCPSelect
            onClose={handleMCPSelectClose}
            onBrowse={() => setMode("mcp_browse")}
            isActive={isMCPSelectOpen}
          />
        )}

        {/* MCP Browser Overlay */}
        {isMCPBrowserOpen && (
          <MCPBrowser
            onClose={handleMCPBrowserClose}
            isActive={isMCPBrowserOpen}
          />
        )}

        {/* File Picker Overlay */}
        {filePickerOpen && (
          <FilePicker
            query={filePickerQuery}
            cwd={process.cwd()}
            filePickerState={filePickerState}
            onSelect={handleFileSelect}
            onCancel={handleFilePickerCancel}
            onQueryChange={setFilePickerQuery}
            isActive={filePickerOpen}
          />
        )}

        {/* Inline Input Area */}
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={
            isLocked
              ? colors.border
              : filePickerOpen
                ? colors.borderWarning
                : colors.borderFocus
          }
          paddingX={1}
        >
          {/* Show attached images */}
          {pasteState.pastedImages.length > 0 && (
            <ImageAttachment images={pasteState.pastedImages} />
          )}

          {isLocked ? (
            <Text dimColor>Input locked during execution...</Text>
          ) : isEmpty ? (
            <Box>
              <Text color={colors.primary}>&gt; </Text>
              <Text backgroundColor={colors.bgCursor} color={colors.textDim}>
                T
              </Text>
              <Text dimColor>ype your message...</Text>
            </Box>
          ) : (
            lines.map((line, i) => (
              <Box key={i}>
                <Text color={colors.primary}>{i === 0 ? "> " : "│ "}</Text>
                <InputLine
                  line={line}
                  lineIndex={i}
                  lineStartPos={calculateLineStartPos(inputBuffer, i)}
                  cursorLine={cursorLine}
                  cursorCol={cursorCol}
                  pastedBlocks={pasteState.pastedBlocks}
                  colors={colors}
                />
              </Box>
            ))
          )}

          <Box marginTop={1}>
            <Text dimColor>Enter • @ files • Ctrl+M mode • Ctrl+I image</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
