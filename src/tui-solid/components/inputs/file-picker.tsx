import { createSignal, createMemo, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";

interface FilePickerProps {
  files: string[];
  onSelect: (file: string) => void;
  onClose: () => void;
  title?: string;
  isActive?: boolean;
}

const MAX_VISIBLE = 15;

export function FilePicker(props: FilePickerProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [filter, setFilter] = createSignal("");

  const filteredFiles = createMemo(() => {
    const query = filter().toLowerCase();
    if (!query) return props.files;
    return props.files.filter((f) => f.toLowerCase().includes(query));
  });

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      const file = filteredFiles()[selectedIndex()];
      if (file) {
        props.onSelect(file);
        props.onClose();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      const files = filteredFiles();
      setSelectedIndex((prev) => {
        const newIndex = prev > 0 ? prev - 1 : files.length - 1;
        if (newIndex < scrollOffset()) {
          setScrollOffset(newIndex);
        }
        if (prev === 0 && newIndex === files.length - 1) {
          setScrollOffset(Math.max(0, files.length - MAX_VISIBLE));
        }
        return newIndex;
      });
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      const files = filteredFiles();
      setSelectedIndex((prev) => {
        const newIndex = prev < files.length - 1 ? prev + 1 : 0;
        if (newIndex >= scrollOffset() + MAX_VISIBLE) {
          setScrollOffset(newIndex - MAX_VISIBLE + 1);
        }
        if (prev === files.length - 1 && newIndex === 0) {
          setScrollOffset(0);
        }
        return newIndex;
      });
      evt.preventDefault();
      return;
    }

    if (evt.name === "backspace" || evt.name === "delete") {
      if (filter().length > 0) {
        setFilter(filter().slice(0, -1));
        setSelectedIndex(0);
        setScrollOffset(0);
      }
      evt.preventDefault();
      return;
    }

    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      setFilter(filter() + evt.name);
      setSelectedIndex(0);
      setScrollOffset(0);
      evt.preventDefault();
    }
  });

  const visibleFiles = createMemo(() =>
    filteredFiles().slice(scrollOffset(), scrollOffset() + MAX_VISIBLE),
  );

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.primary}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
    >
      <box marginBottom={1} flexDirection="row">
        <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
          {props.title ?? "Select File"}
        </text>
        <Show when={filter()}>
          <text fg={theme.colors.textDim}> - filtering: </text>
          <text fg={theme.colors.warning}>{filter()}</text>
        </Show>
      </box>

      <Show
        when={filteredFiles().length > 0}
        fallback={
          <text fg={theme.colors.textDim}>No files match "{filter()}"</text>
        }
      >
        <box flexDirection="column">
          <Show when={scrollOffset() > 0}>
            <text fg={theme.colors.textDim}>
              {" "}
              ↑ {scrollOffset()} more above
            </text>
          </Show>

          <For each={visibleFiles()}>
            {(file, visibleIndex) => {
              const actualIndex = () => scrollOffset() + visibleIndex();
              const isSelected = () => actualIndex() === selectedIndex();

              return (
                <box flexDirection="row">
                  <text
                    fg={isSelected() ? theme.colors.primary : undefined}
                    attributes={
                      isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                    }
                  >
                    {isSelected() ? "> " : "  "}
                  </text>
                  <text fg={isSelected() ? theme.colors.primary : undefined}>
                    {file}
                  </text>
                </box>
              );
            }}
          </For>

          <Show when={scrollOffset() + MAX_VISIBLE < filteredFiles().length}>
            <text fg={theme.colors.textDim}>
              {" "}
              ↓ {filteredFiles().length - scrollOffset() - MAX_VISIBLE} more
              below
            </text>
          </Show>
        </box>
      </Show>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Type to filter | Esc close
        </text>
      </box>
    </box>
  );
}
