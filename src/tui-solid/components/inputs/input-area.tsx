import { createMemo, Show, For, onMount, onCleanup } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextareaRenderable, type PasteEvent } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { matchesAction } from "@services/keybind-resolver";
import {
  readClipboardImage,
  formatImageSize,
  getImageSizeFromBase64,
} from "@services/clipboard-service";

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
      mode === "learning_prompt" ||
      mode === "help_menu" ||
      mode === "help_detail" ||
      mode === "brain_menu" ||
      mode === "brain_login" ||
      mode === "provider_select" ||
      mode === "mcp_browse"
    );
  });
  const placeholder = () =>
    props.placeholder ?? "Ask anything... (@ for files, / for commands)";

  const borderColor = createMemo(() => {
    if (isLocked()) return theme.colors.borderWarning;
    if (app.inputBuffer()) return theme.colors.borderFocus;
    return theme.colors.border;
  });

  /**
   * Try to read an image from the clipboard and add it as a pasted image.
   * Called on Ctrl+V — if an image is found it gets inserted as a placeholder;
   * otherwise the default text-paste behavior takes over.
   */
  const handleImagePaste = async (): Promise<boolean> => {
    try {
      const image = await readClipboardImage();
      if (!image) return false;

      // Store the image in app state
      app.addPastedImage(image);

      // Insert a visual placeholder into the input
      const size = formatImageSize(getImageSizeFromBase64(image.data));
      const placeholder = `[Image: ${image.mediaType.split("/")[1].toUpperCase()} ${size}]`;

      if (inputRef) {
        inputRef.insertText(placeholder + " ");
        app.setInputBuffer(inputRef.plainText);
      }

      return true;
    } catch {
      return false;
    }
  };

  // Keyboard handler using configurable keybinds from keybind-resolver.
  // Keybinds are loaded from ~/.config/codetyper/keybindings.json on startup.
  // See DEFAULT_KEYBINDS in constants/keybinds.ts for all available actions.
  useKeyboard((evt) => {
    // Mode toggle — works even when locked or menus are open
    if (matchesAction(evt, "mode_toggle")) {
      app.toggleInteractionMode();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (isLocked()) return;
    // Don't capture keys when any menu/modal is open
    if (isMenuOpen()) return;

    // Ctrl+V: attempt clipboard image paste first, then fall through to text paste
    if (matchesAction(evt, "input_paste")) {
      handleImagePaste().then((handled) => {
        // If an image was found, the placeholder is already inserted.
        // If not, the default terminal paste (text) has already fired.
        if (handled) {
          // Image was pasted — nothing else to do
        }
      });
      // Don't preventDefault — let the terminal's native text paste
      // fire in parallel. If the clipboard has an image, handleImagePaste
      // will insert its own placeholder; the text paste will be empty/no-op.
      return;
    }

    // Command menu from "/" — works at any point in the input
    if (matchesAction(evt, "command_menu")) {
      app.insertText("/");
      app.openCommandMenu();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    // File picker from "@" — works at any point in the input
    if (matchesAction(evt, "file_picker")) {
      app.insertText("@");
      app.setMode("file_picker");
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    // Submit input
    if (
      matchesAction(evt, "input_submit") &&
      !evt.shift &&
      !evt.ctrl &&
      !evt.meta
    ) {
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
      // NOTE: Do NOT clear pasted images here — the message handler reads them
      // asynchronously and clears them after consuming. Clearing here would race
      // and cause images to be silently dropped.
    }
  };

  const imageCount = createMemo(() => app.pastedImages().length);

  /**
   * Handle paste events - summarize large pastes
   */
  const handlePaste = (event: PasteEvent): void => {
    if (isLocked()) {
      event.preventDefault();
      return;
    }

    // Normalize line endings (Windows ConPTY sends CR-only newlines)
    const normalizedText = event.text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    const pastedContent = normalizedText.trim();

    if (!pastedContent) return;

    // Check if paste should be summarized
    const lineCount = (pastedContent.match(/\n/g)?.length ?? 0) + 1;
    if (
      lineCount >= MIN_PASTE_LINES ||
      pastedContent.length > MIN_PASTE_CHARS
    ) {
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
            if (
              matchesAction(evt, "input_submit") &&
              !evt.shift &&
              !evt.ctrl &&
              !evt.meta
            ) {
              handleSubmit();
              evt.preventDefault();
            }
            if (matchesAction(evt, "command_menu")) {
              app.insertText("/");
              app.openCommandMenu();
              evt.preventDefault();
            }
            if (matchesAction(evt, "file_picker")) {
              app.insertText("@");
              app.setMode("file_picker");
              evt.preventDefault();
            }
          }}
          onSubmit={handleSubmit}
        />
        <Show when={imageCount() > 0}>
          <box flexDirection="row" paddingTop={0}>
            <For each={app.pastedImages()}>
              {(img) => (
                <text fg={theme.colors.accent}>
                  {` [${img.mediaType.split("/")[1].toUpperCase()} ${formatImageSize(getImageSizeFromBase64(img.data))}]`}
                </text>
              )}
            </For>
            <text fg={theme.colors.textDim}>
              {` (${imageCount()} image${imageCount() > 1 ? "s" : ""} attached)`}
            </text>
          </box>
        </Show>
      </Show>
    </box>
  );
}
