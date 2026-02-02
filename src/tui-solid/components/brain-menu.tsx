import { createSignal, Show, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { BRAIN_BANNER } from "@constants/brain";

interface BrainMenuProps {
  onSetJwtToken: (jwtToken: string) => Promise<void>;
  onSetApiKey: (apiKey: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onClose: () => void;
  isActive?: boolean;
}

type MenuView = "main" | "login_url" | "jwt_input" | "apikey";

interface MenuItem {
  id: string;
  label: string;
  description: string;
  action: () => void;
  disabled?: boolean;
}

export function BrainMenu(props: BrainMenuProps) {
  const theme = useTheme();
  const app = useAppStore();
  const isActive = () => props.isActive ?? true;

  const [view, setView] = createSignal<MenuView>("main");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [jwtToken, setJwtToken] = createSignal("");
  const [apiKey, setApiKey] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  const isConnected = () => app.brain().status === "connected";

  const menuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    if (!isConnected()) {
      items.push({
        id: "login",
        label: "Login with Email",
        description: "Get JWT token from the web portal",
        action: () => {
          setView("login_url");
          setSelectedIndex(0);
        },
      });
      items.push({
        id: "apikey",
        label: "Use API Key",
        description: "Enter your API key directly",
        action: () => {
          setView("apikey");
          setSelectedIndex(0);
        },
      });
    } else {
      items.push({
        id: "logout",
        label: "Logout",
        description: "Disconnect from CodeTyper Brain",
        action: async () => {
          setLoading(true);
          try {
            await props.onLogout();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Logout failed");
          } finally {
            setLoading(false);
          }
        },
      });
    }

    items.push({
      id: "close",
      label: "Close",
      description: "Return to session",
      action: () => props.onClose(),
    });

    return items;
  };

  const handleJwtSubmit = async (): Promise<void> => {
    if (!jwtToken()) {
      setError("JWT token is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await props.onSetJwtToken(jwtToken());
      setView("main");
      setJwtToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set JWT token");
    } finally {
      setLoading(false);
    }
  };

  const handleApiKey = async (): Promise<void> => {
    if (!apiKey()) {
      setError("API key is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await props.onSetApiKey(apiKey());
      setView("main");
      setApiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set API key");
    } finally {
      setLoading(false);
    }
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      if (view() !== "main") {
        setView("main");
        setError(null);
        setSelectedIndex(0);
      } else {
        props.onClose();
      }
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    // Main menu navigation
    if (view() === "main") {
      if (evt.name === "up") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : menuItems().length - 1));
        evt.preventDefault();
        return;
      }

      if (evt.name === "down") {
        setSelectedIndex((prev) => (prev < menuItems().length - 1 ? prev + 1 : 0));
        evt.preventDefault();
        return;
      }

      if (evt.name === "return") {
        const item = menuItems()[selectedIndex()];
        if (item && !item.disabled) {
          item.action();
        }
        evt.preventDefault();
        return;
      }
    }

    // Login URL view - press Enter to go to JWT input
    if (view() === "login_url") {
      if (evt.name === "return") {
        setView("jwt_input");
        evt.preventDefault();
        return;
      }
    }

    // JWT token input handling
    if (view() === "jwt_input") {
      if (evt.name === "return") {
        handleJwtSubmit();
        evt.preventDefault();
        return;
      }

      if (evt.name === "backspace") {
        setJwtToken((prev) => prev.slice(0, -1));
        evt.preventDefault();
        return;
      }

      if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
        setJwtToken((prev) => prev + evt.name);
        evt.preventDefault();
        return;
      }
    }

    // API key form handling
    if (view() === "apikey") {
      if (evt.name === "return") {
        handleApiKey();
        evt.preventDefault();
        return;
      }

      if (evt.name === "backspace") {
        setApiKey((prev) => prev.slice(0, -1));
        evt.preventDefault();
        return;
      }

      if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
        setApiKey((prev) => prev + evt.name);
        evt.preventDefault();
        return;
      }
    }
  });

  const getStatusColor = (): string => {
    const status = app.brain().status;
    const colorMap: Record<string, string> = {
      connected: theme.colors.success,
      connecting: theme.colors.warning,
      disconnected: theme.colors.textDim,
      error: theme.colors.error,
    };
    return colorMap[status] ?? theme.colors.textDim;
  };

  const getStatusText = (): string => {
    const status = app.brain().status;
    const textMap: Record<string, string> = {
      connected: "Connected",
      connecting: "Connecting...",
      disconnected: "Not connected",
      error: "Connection error",
    };
    return textMap[status] ?? "Unknown";
  };

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.accent}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
      width={60}
    >
      {/* Header */}
      <box marginBottom={1} flexDirection="row" gap={1}>
        <text fg="#ff69b4" attributes={TextAttributes.BOLD}>
          {BRAIN_BANNER.EMOJI_CONNECTED}
        </text>
        <text fg={theme.colors.accent} attributes={TextAttributes.BOLD}>
          CodeTyper Brain
        </text>
      </box>

      {/* Status */}
      <box marginBottom={1} flexDirection="row">
        <text fg={theme.colors.textDim}>Status: </text>
        <text fg={getStatusColor()}>{getStatusText()}</text>
        <Show when={isConnected()}>
          <text fg={theme.colors.textDim}>
            {" "}({app.brain().knowledgeCount}K / {app.brain().memoryCount}M)
          </text>
        </Show>
      </box>

      <Show when={isConnected() && app.brain().user}>
        <box marginBottom={1} flexDirection="row">
          <text fg={theme.colors.textDim}>User: </text>
          <text fg={theme.colors.info}>
            {app.brain().user?.display_name ?? app.brain().user?.email}
          </text>
        </box>
      </Show>

      {/* Error message */}
      <Show when={error()}>
        <box marginBottom={1}>
          <text fg={theme.colors.error}>{error()}</text>
        </box>
      </Show>

      {/* Main menu view */}
      <Show when={view() === "main"}>
        <box flexDirection="column">
          <For each={menuItems()}>
            {(item, index) => {
              const isSelected = () => index() === selectedIndex();
              return (
                <box flexDirection="column" marginBottom={1}>
                  <box flexDirection="row">
                    <text
                      fg={isSelected() ? theme.colors.accent : undefined}
                      attributes={isSelected() ? TextAttributes.BOLD : TextAttributes.NONE}
                    >
                      {isSelected() ? "> " : "  "}
                    </text>
                    <text
                      fg={isSelected() ? theme.colors.accent : undefined}
                      attributes={isSelected() ? TextAttributes.BOLD : TextAttributes.NONE}
                    >
                      {item.label}
                    </text>
                  </box>
                  <box marginLeft={4}>
                    <text fg={theme.colors.textDim}>{item.description}</text>
                  </box>
                </box>
              );
            }}
          </For>
        </box>

        <box marginTop={1} flexDirection="column">
          <text fg={theme.colors.info}>{BRAIN_BANNER.CTA}: {BRAIN_BANNER.URL}</text>
          <text fg={theme.colors.textDim}>
            Arrow keys navigate | Enter select | Esc close
          </text>
        </box>
      </Show>

      {/* Login URL view - shows where to login */}
      <Show when={view() === "login_url"}>
        <box flexDirection="column">
          <box marginBottom={1}>
            <text fg={theme.colors.text}>1. Go to this page to login:</text>
          </box>
          <box marginBottom={1}>
            <text fg={theme.colors.accent} attributes={TextAttributes.BOLD}>
              {BRAIN_BANNER.LOGIN_URL}
            </text>
          </box>
          <box marginBottom={1}>
            <text fg={theme.colors.text}>2. After logging in, copy your JWT token</text>
          </box>
          <box marginBottom={1}>
            <text fg={theme.colors.text}>3. Press Enter to input your token</text>
          </box>
        </box>

        <box marginTop={1}>
          <text fg={theme.colors.textDim}>
            Enter continue | Esc back
          </text>
        </box>
      </Show>

      {/* JWT token input view */}
      <Show when={view() === "jwt_input"}>
        <box flexDirection="column">
          <box marginBottom={1} flexDirection="column">
            <text fg={theme.colors.accent}>JWT Token:</text>
            <box
              borderColor={theme.colors.accent}
              border={["top", "bottom", "left", "right"]}
              paddingLeft={1}
              paddingRight={1}
            >
              <text fg={theme.colors.text}>
                {jwtToken() ? "*".repeat(Math.min(jwtToken().length, 40)) : " "}
              </text>
            </box>
          </box>

          <Show when={loading()}>
            <text fg={theme.colors.warning}>Saving token...</text>
          </Show>
        </box>

        <box marginTop={1}>
          <text fg={theme.colors.textDim}>Enter save | Esc back</text>
        </box>
      </Show>

      {/* API key form view */}
      <Show when={view() === "apikey"}>
        <box flexDirection="column">
          <box marginBottom={1} flexDirection="column">
            <text fg={theme.colors.accent}>API Key:</text>
            <box
              borderColor={theme.colors.accent}
              border={["top", "bottom", "left", "right"]}
              paddingLeft={1}
              paddingRight={1}
            >
              <text fg={theme.colors.text}>
                {apiKey() ? "*".repeat(Math.min(apiKey().length, 40)) : " "}
              </text>
            </box>
          </box>

          <Show when={loading()}>
            <text fg={theme.colors.warning}>Setting API key...</text>
          </Show>
        </box>

        <box marginTop={1}>
          <text fg={theme.colors.textDim}>Enter save | Esc back</text>
        </box>
      </Show>
    </box>
  );
}
