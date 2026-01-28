import { createMemo, Show, onMount, onCleanup } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextareaRenderable, type PasteEvent } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";

/** Minimum lines to trigger paste summary */
const MIN_PASTE_LINES = 3;
/** Minimum characters to trigger paste summary */
const MIN_PASTE_CHARS = 150;

interface InputAreaProps {
  onSubmit: (input: string) => void;
  placeholder?: string;
}

/** Stores pasted content that was summarized */
type PastedBlock = {
  id: number;
  content: string;
  placeholder: string;
};

export function InputArea(props: InputAreaProps) {
  let inputRef: TextareaRenderable;
  let pasteCounter = 0;
  let pastedBlocks: Map<string, PastedBlock> = new Map();

  const theme = useTheme();
  const app = useAppStore();

  const isLocked = createMemo(() => app.isInputLocked());

  /**
   * Insert pasted text as virtual placeholder
   */
  const pasteText = (text: string, virtualText: string): void => {
    if (!inputRef) return;

    pasteCounter++;
    const id = pasteCounter;

    // Insert the placeholder text
    inputRef.insertText(virtualText + " ");

    // Store the actual content - use placeholder as key for simple lookup
    const block: PastedBlock = {
      id,
      content: text,
      placeholder: virtualText,
    };
    pastedBlocks.set(virtualText, block);

    app.setInputBuffer(inputRef.plainText);
  };

  /**
   * Expand all pasted blocks back to their original content
   */
  const expandPastedContent = (inputText: string): string => {
    if (pastedBlocks.size === 0) return inputText;

    let result = inputText;

    // Simple string replacement - replace each placeholder with actual content
    for (const block of pastedBlocks.values()) {
      // Replace placeholder (with or without trailing space)
      result = result.replace(block.placeholder + " ", block.content);
      result = result.replace(block.placeholder, block.content);
    }

    return result;
  };

  /**
   * Clear all pasted blocks
   */
  const clearPastedBlocks = (): void => {
    pastedBlocks.clear();
    pasteCounter = 0;
  };
  const isMenuOpen = createMemo(() => {
    const mode = app.mode();
    return (
      app.commandMenu().isOpen ||
      mode === "command_menu" ||
      mode === "model_select" ||
      mode === "theme_select" ||
      mode === "agent_select" ||
      mode === "mode_select" ||
      mode === "mcp_select" ||
      mode === "mcp_add" ||
      mode === "file_picker" ||
      mode === "permission_prompt" ||
      mode === "learning_prompt"
    );
  });
  const placeholder = () =>
    props.placeholder ?? "Ask anything... (@ for files, / for commands)";

  const borderColor = createMemo(() => {
    if (isLocked()) return theme.colors.borderWarning;
    if (app.inputBuffer()) return theme.colors.borderFocus;
    return theme.colors.border;
  });

  // Handle "/" to open command menu when input is empty
  // Handle Enter to submit (backup in case onSubmit doesn't fire)
  // Handle Ctrl+Tab to toggle interaction mode
  useKeyboard((evt) => {
    // Ctrl+Tab works even when locked or menus are open
    if (evt.ctrl && evt.name === "tab") {
      app.toggleInteractionMode();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (isLocked()) return;
    // Don't capture keys when any menu/modal is open
    if (isMenuOpen()) return;

    if (evt.name === "/" && !app.inputBuffer()) {
      app.openCommandMenu();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "@") {
      app.setMode("file_picker");
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return" && !evt.shift && !evt.ctrl && !evt.meta) {
      handleSubmit();
      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  const handleSubmit = (): void => {
    // Get value from app store (synced via onContentChange) or directly from ref
    let value = (app.inputBuffer() || inputRef?.plainText || "").trim();
    if (value && !isLocked()) {
      // Expand pasted content placeholders back to actual content
      value = expandPastedContent(value);
      props.onSubmit(value);
      if (inputRef) inputRef.clear();
      app.setInputBuffer("");
      clearPastedBlocks();
    }
  };

  /**
   * Handle paste events - summarize large pastes
   */
  const handlePaste = (event: PasteEvent): void => {
    if (isLocked()) {
      event.preventDefault();
      return;
    }

    // Normalize line endings (Windows ConPTY sends CR-only newlines)
    const normalizedText = event.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const pastedContent = normalizedText.trim();

    if (!pastedContent) return;

    // Check if paste should be summarized
    const lineCount = (pastedContent.match(/\n/g)?.length ?? 0) + 1;
    if (lineCount >= MIN_PASTE_LINES || pastedContent.length > MIN_PASTE_CHARS) {
      event.preventDefault();
      pasteText(pastedContent, `[Pasted ~${lineCount} lines]`);
    }
    // Otherwise let default paste behavior handle it
  };

  // Register insert function so external code can insert text
  onMount(() => {
    app.setInputInsertFn((text: string) => {
      if (inputRef) {
        inputRef.insertText(text);
        app.setInputBuffer(inputRef.plainText);
      }
    });
  });

  onCleanup(() => {
    app.setInputInsertFn(null);
  });

  return (
    <box
      flexDirection="column"
      borderColor={borderColor()}
      border={["top", "bottom", "left", "right"]}
      paddingLeft={1}
      paddingRight={1}
      minHeight={6}
    >
      <Show
        when={!isLocked()}
        fallback={
          <box paddingTop={1} paddingBottom={1}>
            <text fg={theme.colors.textDim}>
              Input locked while processing...
            </text>
          </box>
        }
      >
        <textarea
          ref={(val: TextareaRenderable) => (inputRef = val)}
          placeholder={placeholder()}
          minHeight={1}
          maxHeight={6}
          textColor={theme.colors.text}
          focused={!isLocked() && !isMenuOpen()}
          onContentChange={() => {
            if (inputRef) {
              app.setInputBuffer(inputRef.plainText);
            }
          }}
          onPaste={handlePaste}
          onKeyDown={(evt) => {
            // Don't capture keys when any menu/modal is open
            if (isMenuOpen()) return;
            if (evt.name === "return" && !evt.shift && !evt.ctrl && !evt.meta) {
              handleSubmit();
              evt.preventDefault();
            }
            if (evt.name === "/" && !app.inputBuffer()) {
              app.openCommandMenu();
              evt.preventDefault();
            }
            if (evt.name === "@") {
              app.setMode("file_picker");
              evt.preventDefault();
            }
          }}
          onSubmit={handleSubmit}
        />
      </Show>
    </box>
  );
}
