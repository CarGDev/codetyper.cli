import { createMemo, createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { LogEntryDisplay } from "@tui-solid/components/log-entry";
import { ASCII_LOGO, ASCII_LOGO_GRADIENT, HOME_VARS } from "@constants/home";

const SCROLL_LINES = 3;
const MOUSE_ENABLE = "\x1b[?1000h\x1b[?1006h";
const MOUSE_DISABLE = "\x1b[?1000l\x1b[?1006l";
const SGR_MOUSE_PATTERN = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;

const parseMouseScroll = (data: string): "up" | "down" | null => {
  const match = data.match(SGR_MOUSE_PATTERN);
  if (!match) return null;

  const button = parseInt(match[1], 10);
  if (button === 64) return "up";
  if (button === 65) return "down";
  return null;
};

export function LogPanel() {
  const theme = useTheme();
  const app = useAppStore();
  let scrollboxRef: ScrollBoxRenderable | undefined;
  const [stickyEnabled, setStickyEnabled] = createSignal(true);

  const logs = createMemo(() => {
    return app.logs().filter((entry) => {
      if (entry.type !== "tool") return true;
      if (entry.metadata?.quiet) return false;
      return true;
    });
  });

  const hasContent = createMemo(() => logs().length > 0);

  const canScroll = createMemo(() => {
    const mode = app.mode();
    return (
      mode === "idle" ||
      mode === "thinking" ||
      mode === "tool_execution" ||
      mode === "editing"
    );
  });

  const scrollUp = (): void => {
    if (!scrollboxRef) return;
    setStickyEnabled(false);
    scrollboxRef.scrollBy(-SCROLL_LINES);
  };

  const scrollDown = (): void => {
    if (!scrollboxRef) return;
    scrollboxRef.scrollBy(SCROLL_LINES);

    const isAtBottom =
      scrollboxRef.scrollTop >=
      scrollboxRef.content.height - scrollboxRef.viewport.height - 1;
    if (isAtBottom) {
      setStickyEnabled(true);
    }
  };

  const scrollToBottom = (): void => {
    if (!scrollboxRef) return;
    scrollboxRef.scrollTo(Infinity);
    setStickyEnabled(true);
  };

  useKeyboard((evt) => {
    if (!canScroll()) return;

    if (evt.shift && evt.name === "up") {
      scrollUp();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.shift && evt.name === "down") {
      scrollDown();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.shift && evt.name === "home") {
      if (scrollboxRef) {
        setStickyEnabled(false);
        scrollboxRef.scrollTo(0);
      }
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.shift && evt.name === "end") {
      scrollToBottom();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }
  });

  onMount(() => {
    process.stdout.write(MOUSE_ENABLE);

    const handleData = (data: Buffer): void => {
      if (!canScroll()) return;

      const str = data.toString();
      const direction = parseMouseScroll(str);

      if (direction === "up") {
        scrollUp();
      } else if (direction === "down") {
        scrollDown();
      }
    };

    process.stdin.on("data", handleData);

    onCleanup(() => {
      process.stdout.write(MOUSE_DISABLE);
      process.stdin.off("data", handleData);
    });
  });

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      paddingLeft={1}
      paddingRight={1}
      borderColor={theme.colors.border}
      border={["top", "bottom", "left", "right"]}
    >
      <Show
        when={hasContent()}
        fallback={
          <box
            flexGrow={1}
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
            <For each={ASCII_LOGO}>
              {(line, index) => (
                <text fg={ASCII_LOGO_GRADIENT[index()] ?? theme.colors.primary}>
                  {line}
                </text>
              )}
            </For>
            <box marginTop={2}>
              <text fg={theme.colors.textDim}>{HOME_VARS.subTitle}</text>
            </box>
          </box>
        }
      >
        <scrollbox
          ref={scrollboxRef}
          stickyScroll={stickyEnabled()}
          stickyStart="bottom"
          flexGrow={1}
        >
          <box flexDirection="column">
            <For each={logs()}>
              {(entry) => <LogEntryDisplay entry={entry} />}
            </For>
          </box>
        </scrollbox>
      </Show>
    </box>
  );
}
