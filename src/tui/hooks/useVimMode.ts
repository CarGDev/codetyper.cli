/**
 * useVimMode Hook
 *
 * React hook for vim mode keyboard handling in the TUI
 */

import { useCallback, useEffect } from "react";
import { useInput } from "ink";
import type { Key } from "ink";
import type { VimMode, VimAction, VimKeyEventResult } from "@/types/vim";
import { useVimStore, vimActions } from "@stores/vim-store";
import {
  VIM_DEFAULT_BINDINGS,
  VIM_SCROLL_AMOUNTS,
  ESCAPE_KEYS,
  VIM_COMMANDS,
} from "@constants/vim";

/**
 * Options for useVimMode hook
 */
interface UseVimModeOptions {
  /** Whether the hook is active */
  isActive?: boolean;
  /** Callback when scrolling up */
  onScrollUp?: (lines: number) => void;
  /** Callback when scrolling down */
  onScrollDown?: (lines: number) => void;
  /** Callback when going to top */
  onGoToTop?: () => void;
  /** Callback when going to bottom */
  onGoToBottom?: () => void;
  /** Callback when entering insert mode */
  onEnterInsert?: () => void;
  /** Callback when executing a command */
  onCommand?: (command: string) => void;
  /** Callback when search pattern changes */
  onSearch?: (pattern: string) => void;
  /** Callback when going to next search match */
  onSearchNext?: () => void;
  /** Callback when going to previous search match */
  onSearchPrev?: () => void;
  /** Callback for quit command */
  onQuit?: () => void;
  /** Callback for write (save) command */
  onWrite?: () => void;
}

/**
 * Parse a vim command string
 */
const parseCommand = (
  command: string
): { name: string; args: string[] } | null => {
  const trimmed = command.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const name = parts[0] || "";
  const args = parts.slice(1);

  return { name, args };
};

/**
 * Find matching key binding
 */
const findBinding = (
  key: string,
  mode: VimMode,
  ctrl: boolean,
  shift: boolean
) => {
  return VIM_DEFAULT_BINDINGS.find((binding) => {
    if (binding.mode !== mode) return false;
    if (binding.key.toLowerCase() !== key.toLowerCase()) return false;
    if (binding.ctrl && !ctrl) return false;
    if (binding.shift && !shift) return false;
    return true;
  });
};

/**
 * Check if key is escape
 */
const isEscape = (input: string, key: Key): boolean => {
  return key.escape || ESCAPE_KEYS.includes(input);
};

/**
 * useVimMode hook
 */
export const useVimMode = (options: UseVimModeOptions = {}) => {
  const {
    isActive = true,
    onScrollUp,
    onScrollDown,
    onGoToTop,
    onGoToBottom,
    onEnterInsert,
    onCommand,
    onSearch,
    onSearchNext,
    onSearchPrev,
    onQuit,
    onWrite,
  } = options;

  const mode = useVimStore((state) => state.mode);
  const enabled = useVimStore((state) => state.enabled);
  const commandBuffer = useVimStore((state) => state.commandBuffer);
  const searchPattern = useVimStore((state) => state.searchPattern);
  const config = useVimStore((state) => state.config);

  /**
   * Handle action execution
   */
  const executeAction = useCallback(
    (action: VimAction, argument?: string | number): void => {
      const actionHandlers: Record<VimAction, () => void> = {
        scroll_up: () => onScrollUp?.(VIM_SCROLL_AMOUNTS.LINE),
        scroll_down: () => onScrollDown?.(VIM_SCROLL_AMOUNTS.LINE),
        scroll_half_up: () => onScrollUp?.(VIM_SCROLL_AMOUNTS.HALF_PAGE),
        scroll_half_down: () => onScrollDown?.(VIM_SCROLL_AMOUNTS.HALF_PAGE),
        goto_top: () => onGoToTop?.(),
        goto_bottom: () => onGoToBottom?.(),
        enter_insert: () => {
          vimActions.setMode("insert");
          onEnterInsert?.();
        },
        enter_command: () => {
          vimActions.setMode("command");
          vimActions.clearCommandBuffer();
        },
        enter_visual: () => {
          vimActions.setMode("visual");
        },
        exit_mode: () => {
          vimActions.setMode("normal");
          vimActions.clearCommandBuffer();
          vimActions.clearSearch();
        },
        search_start: () => {
          vimActions.setMode("command");
          vimActions.setCommandBuffer("/");
        },
        search_next: () => {
          vimActions.nextMatch();
          onSearchNext?.();
        },
        search_prev: () => {
          vimActions.prevMatch();
          onSearchPrev?.();
        },
        execute_command: () => {
          const buffer = vimActions.getState().commandBuffer;

          // Check if it's a search
          if (buffer.startsWith("/")) {
            const pattern = buffer.slice(1);
            vimActions.setSearchPattern(pattern);
            onSearch?.(pattern);
            vimActions.setMode("normal");
            vimActions.clearCommandBuffer();
            return;
          }

          const parsed = parseCommand(buffer);
          if (parsed) {
            const { name, args } = parsed;

            // Handle built-in commands
            if (name === VIM_COMMANDS.QUIT || name === VIM_COMMANDS.QUIT_FORCE) {
              onQuit?.();
            } else if (name === VIM_COMMANDS.WRITE) {
              onWrite?.();
            } else if (name === VIM_COMMANDS.WRITE_QUIT) {
              onWrite?.();
              onQuit?.();
            } else if (name === VIM_COMMANDS.NOHL) {
              vimActions.clearSearch();
            } else {
              onCommand?.(buffer);
            }
          }

          vimActions.setMode("normal");
          vimActions.clearCommandBuffer();
        },
        cancel: () => {
          vimActions.setMode("normal");
          vimActions.clearCommandBuffer();
        },
        yank: () => {
          // Yank would copy content to register
          // Implementation depends on what content is available
        },
        paste: () => {
          // Paste from register
          // Implementation depends on context
        },
        delete: () => {
          // Delete selected content
        },
        undo: () => {
          // Undo last change
        },
        redo: () => {
          // Redo last undone change
        },
        word_forward: () => {
          // Move to next word
        },
        word_backward: () => {
          // Move to previous word
        },
        line_start: () => {
          // Move to line start
        },
        line_end: () => {
          // Move to line end
        },
        none: () => {
          // No action
        },
      };

      const handler = actionHandlers[action];
      if (handler) {
        handler();
      }
    },
    [
      onScrollUp,
      onScrollDown,
      onGoToTop,
      onGoToBottom,
      onEnterInsert,
      onCommand,
      onSearch,
      onSearchNext,
      onSearchPrev,
      onQuit,
      onWrite,
    ]
  );

  /**
   * Handle key input
   */
  const handleInput = useCallback(
    (input: string, key: Key): VimKeyEventResult => {
      // Not enabled, pass through
      if (!enabled) {
        return { handled: false, preventDefault: false };
      }

      // Handle escape in any mode
      if (isEscape(input, key) && mode !== "normal") {
        executeAction("exit_mode");
        return { handled: true, preventDefault: true };
      }

      // Command mode - build command buffer
      if (mode === "command") {
        if (key.return) {
          executeAction("execute_command");
          return { handled: true, preventDefault: true };
        }

        if (key.backspace || key.delete) {
          const buffer = vimActions.getState().commandBuffer;
          if (buffer.length > 0) {
            vimActions.setCommandBuffer(buffer.slice(0, -1));
          }
          if (buffer.length <= 1) {
            executeAction("cancel");
          }
          return { handled: true, preventDefault: true };
        }

        // Add character to command buffer
        if (input && input.length === 1) {
          vimActions.appendCommandBuffer(input);
          return { handled: true, preventDefault: true };
        }

        return { handled: true, preventDefault: true };
      }

      // Normal mode - check bindings
      if (mode === "normal") {
        const binding = findBinding(input, mode, key.ctrl, key.shift);

        if (binding) {
          executeAction(binding.action, binding.argument);
          return {
            handled: true,
            action: binding.action,
            preventDefault: true,
          };
        }

        // Handle 'gg' for go to top (two-key sequence)
        // For simplicity, we handle 'g' as goto_top
        // A full implementation would track pending keys

        return { handled: false, preventDefault: false };
      }

      // Visual mode
      if (mode === "visual") {
        const binding = findBinding(input, mode, key.ctrl, key.shift);

        if (binding) {
          executeAction(binding.action, binding.argument);
          return {
            handled: true,
            action: binding.action,
            preventDefault: true,
          };
        }

        return { handled: false, preventDefault: false };
      }

      // Insert mode - pass through to normal input handling
      return { handled: false, preventDefault: false };
    },
    [enabled, mode, executeAction]
  );

  // Use ink's input hook
  useInput(
    (input, key) => {
      if (!isActive || !enabled) return;

      const result = handleInput(input, key);

      // Result handling is done by the callbacks
    },
    { isActive: isActive && enabled }
  );

  return {
    mode,
    enabled,
    commandBuffer,
    searchPattern,
    config,
    handleInput,
    enable: vimActions.enable,
    disable: vimActions.disable,
    toggle: vimActions.toggle,
    setMode: vimActions.setMode,
  };
};

export default useVimMode;
