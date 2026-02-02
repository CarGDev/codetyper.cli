import { For, createSignal, onMount, onCleanup } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";

const SCROLL_LINES = 2;

interface DebugEntry {
  id: string;
  timestamp: number;
  type: "api" | "stream" | "tool" | "state" | "error" | "info" | "render";
  message: string;
}

// Global debug log store
let debugEntries: DebugEntry[] = [];
let debugIdCounter = 0;
let listeners: Array<() => void> = [];

const notifyListeners = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const addDebugLog = (
  type: DebugEntry["type"],
  message: string,
): void => {
  const entry: DebugEntry = {
    id: `debug-${++debugIdCounter}`,
    timestamp: Date.now(),
    type,
    message,
  };
  debugEntries.push(entry);
  // Keep only last 500 entries
  if (debugEntries.length > 500) {
    debugEntries = debugEntries.slice(-500);
  }
  notifyListeners();
};

export const clearDebugLogs = (): void => {
  debugEntries = [];
  debugIdCounter = 0;
  notifyListeners();
};

export function DebugLogPanel() {
  const theme = useTheme();
  const app = useAppStore();
  let scrollboxRef: ScrollBoxRenderable | undefined;
  const [entries, setEntries] = createSignal<DebugEntry[]>([...debugEntries]);
  const [stickyEnabled, setStickyEnabled] = createSignal(true);

  const isActive = () => app.debugLogVisible();

  onMount(() => {
    const updateEntries = (): void => {
      setEntries([...debugEntries]);
      if (stickyEnabled() && scrollboxRef) {
        scrollboxRef.scrollTo(Infinity);
      }
    };
    listeners.push(updateEntries);

    onCleanup(() => {
      listeners = listeners.filter((l) => l !== updateEntries);
    });
  });

  const getTypeColor = (type: DebugEntry["type"]): string => {
    const colorMap: Record<DebugEntry["type"], string> = {
      api: theme.colors.info,
      stream: theme.colors.success,
      tool: theme.colors.warning,
      state: theme.colors.accent,
      error: theme.colors.error,
      info: theme.colors.textDim,
      render: theme.colors.primary,
    };
    return colorMap[type];
  };

  const getTypeLabel = (type: DebugEntry["type"]): string => {
    const labelMap: Record<DebugEntry["type"], string> = {
      api: "API",
      stream: "STR",
      tool: "TUL",
      state: "STA",
      error: "ERR",
      info: "INF",
      render: "RND",
    };
    return labelMap[type];
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  };

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

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.shift && evt.name === "pageup") {
      scrollUp();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.shift && evt.name === "pagedown") {
      scrollDown();
      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  const truncateMessage = (msg: string, maxLen: number): string => {
    if (msg.length <= maxLen) return msg;
    return msg.substring(0, maxLen - 3) + "...";
  };

  return (
    <box
      flexDirection="column"
      width="20%"
      borderColor={theme.colors.border}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
    >
      <box
        paddingLeft={1}
        paddingRight={1}
        borderColor={theme.colors.border}
        border={["bottom"]}
        flexDirection="row"
      >
        <text fg={theme.colors.accent} attributes={TextAttributes.BOLD}>
          Debug Logs ({entries().length})
        </text>
      </box>

      <scrollbox
        ref={scrollboxRef}
        stickyScroll={stickyEnabled()}
        stickyStart="bottom"
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
      >
        <box flexDirection="column">
          <For each={entries()}>
            {(entry) => (
              <box flexDirection="row">
                <text fg={theme.colors.textDim}>
                  {formatTime(entry.timestamp)}{" "}
                </text>
                <text fg={getTypeColor(entry.type)}>
                  [{getTypeLabel(entry.type)}]{" "}
                </text>
                <text fg={theme.colors.text} wrapMode="word">
                  {truncateMessage(entry.message, 50)}
                </text>
              </box>
            )}
          </For>
        </box>
      </scrollbox>

      <box
        paddingLeft={1}
        borderColor={theme.colors.border}
        border={["top"]}
      >
        <text fg={theme.colors.textDim}>Shift+PgUp/PgDn scroll</text>
      </box>
    </box>
  );
}
