import { render, useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import {
  ErrorBoundary,
  Match,
  Switch,
  createSignal,
  createEffect,
} from "solid-js";
import { batch } from "solid-js";
import { getFiles } from "@services/file-picker/files";
import versionData from "@/version.json";
import {
  ExitProvider,
  useExit,
  RouteProvider,
  useRoute,
  AppStoreProvider,
  useAppStore,
  setAppStoreRef,
  ThemeProvider,
  useTheme,
  KeybindProvider,
  DialogProvider,
} from "@tui-solid/context";
import { ToastProvider, Toast, useToast } from "@tui-solid/ui/toast";
import { Home } from "@tui-solid/routes/home";
import { Session } from "@tui-solid/routes/session";
import type { TuiInput, TuiOutput } from "@tui-solid/types";
import type { PermissionScope, LearningScope } from "@/types/tui";
import type { MCPAddFormData } from "@/types/mcp";

interface AgentOption {
  id: string;
  name: string;
  description?: string;
}

interface MCPServer {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  description?: string;
}

interface AppProps extends TuiInput {
  onExit: (output: TuiOutput) => void;
  onSubmit: (input: string) => Promise<void>;
  onCommand: (command: string) => Promise<void>;
  onModelSelect: (model: string) => Promise<void>;
  onThemeSelect: (theme: string) => void;
  onAgentSelect?: (agentId: string) => Promise<void>;
  onMCPSelect?: (serverId: string) => Promise<void>;
  onMCPAdd?: (data: MCPAddFormData) => Promise<void>;
  onFileSelect?: (file: string) => void;
  onProviderSelect?: (providerId: string) => Promise<void>;
  onCascadeToggle?: (enabled: boolean) => Promise<void>;
  onPermissionResponse: (allowed: boolean, scope?: PermissionScope) => void;
  onLearningResponse: (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ) => void;
  plan?: {
    id: string;
    title: string;
    items: Array<{ id: string; text: string; completed: boolean }>;
  } | null;
  agents?: AgentOption[];
  currentAgent?: string;
  mcpServers?: MCPServer[];
  files?: string[];
}

function ErrorFallback(props: { error: Error }) {
  const theme = useTheme();

  return (
    <box
      flexDirection="column"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={2}
      paddingBottom={2}
    >
      <text fg={theme.colors.error} attributes={TextAttributes.BOLD}>
        Application Error
      </text>
      <text fg={theme.colors.error} marginTop={1}>
        {props.error.message}
      </text>
      <text fg={theme.colors.textDim} marginTop={2}>
        Press Ctrl+C to exit
      </text>
    </box>
  );
}

function AppContent(props: AppProps) {
  const route = useRoute();
  const app = useAppStore();
  const exit = useExit();
  const toast = useToast();
  const theme = useTheme();
  const [fileList, setFileList] = createSignal<string[]>([]);

  setAppStoreRef(app);

  // Load files when file_picker mode is activated
  createEffect(() => {
    if (app.mode() === "file_picker") {
      const cwd = process.cwd();
      const entries = getFiles(cwd, cwd);
      const paths = entries.map((e) => e.relativePath);
      setFileList(paths);
    }
  });

  // Initialize version from version.json
  app.setVersion(versionData.version);

  // Initialize theme from props (from config)
  if (props.theme) {
    theme.setTheme(props.theme);
  }

  // Initialize provider and model from props (from config)
  if (props.provider) {
    app.setSessionInfo(
      props.sessionId ?? "",
      props.provider,
      props.model ?? "",
    );
  }

  // Initialize cascade setting from props (from config)
  if (props.cascadeEnabled !== undefined) {
    app.setCascadeEnabled(props.cascadeEnabled);
  }

  // Navigate to session if resuming
  if (props.sessionId) {
    route.goToSession(props.sessionId);
  }

  if (props.availableModels && props.availableModels.length > 0) {
    app.setAvailableModels(props.availableModels);
  }

  // Handle initial prompt after store is initialized
  if (props.initialPrompt && props.initialPrompt.trim()) {
    setTimeout(async () => {
      app.addLog({ type: "user", content: props.initialPrompt! });
      app.setMode("thinking");
      await props.onSubmit(props.initialPrompt!);
    }, 100);
  }

  useKeyboard((evt) => {
    if (evt.ctrl && evt.name === "c") {
      if (app.interruptPending()) {
        exit.exit(0);
      } else {
        app.setInterruptPending(true);
        toast.warning("Press Ctrl+C again to exit");
        setTimeout(() => {
          app.setInterruptPending(false);
        }, 2000);
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "/" && app.mode() === "idle" && !app.inputBuffer()) {
      app.openCommandMenu();
      evt.preventDefault();
      return;
    }
  });

  const handleSubmit = async (input: string): Promise<void> => {
    if (!input.trim()) return;

    if (route.isHome()) {
      const sessionId = `session-${Date.now()}`;
      batch(() => {
        app.setSessionInfo(sessionId, app.provider(), app.model());
        route.goToSession(sessionId);
      });
    }

    app.addLog({ type: "user", content: input });
    app.clearInput();
    app.setMode("thinking");

    try {
      await props.onSubmit(input);
    } finally {
      app.setMode("idle");
    }
  };

  const handleCommand = async (command: string): Promise<void> => {
    // Start a session if on home page for commands that produce output
    if (route.isHome()) {
      const sessionId = `session-${Date.now()}`;
      batch(() => {
        app.setSessionInfo(sessionId, app.provider(), app.model());
        route.goToSession(sessionId);
      });
    }

    try {
      await props.onCommand(command);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleModelSelect = async (model: string): Promise<void> => {
    // Start a session if on home page
    if (route.isHome()) {
      const sessionId = `session-${Date.now()}`;
      batch(() => {
        app.setSessionInfo(sessionId, app.provider(), app.model());
        route.goToSession(sessionId);
      });
    }

    app.setMode("idle");
    try {
      await props.onModelSelect(model);
      app.setModel(model);
      toast.success(`Model changed to ${model}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleThemeSelect = (themeName: string): void => {
    // Start a session if on home page
    if (route.isHome()) {
      const sessionId = `session-${Date.now()}`;
      batch(() => {
        app.setSessionInfo(sessionId, app.provider(), app.model());
        route.goToSession(sessionId);
      });
    }

    app.setMode("idle");
    props.onThemeSelect(themeName);
    toast.success(`Theme changed to ${themeName}`);
  };

  const handlePermissionResponse = (
    allowed: boolean,
    scope?: PermissionScope,
  ): void => {
    // Don't set mode here - the resolve callback in permissions.ts
    // handles the mode transition to "tool_execution"
    props.onPermissionResponse(allowed, scope);
  };

  const handleLearningResponse = (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ): void => {
    // Don't set mode here - the resolve callback handles the mode transition
    props.onLearningResponse(save, scope, editedContent);
  };

  const handleAgentSelect = async (agentId: string): Promise<void> => {
    app.setMode("idle");
    try {
      await props.onAgentSelect?.(agentId);
      toast.success(`Agent changed to ${agentId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleMCPSelect = async (serverId: string): Promise<void> => {
    app.setMode("idle");
    try {
      await props.onMCPSelect?.(serverId);
      toast.success(`MCP server selected: ${serverId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleMCPAdd = async (data: MCPAddFormData): Promise<void> => {
    app.setMode("idle");
    try {
      await props.onMCPAdd?.(data);
      toast.success(`MCP server added: ${data.name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleFileSelect = (file: string): void => {
    app.setMode("idle");
    // Insert the file reference into the textarea as @path
    const fileRef = `@${file} `;
    app.insertText(fileRef);
    props.onFileSelect?.(file);
  };

  const handleProviderSelect = async (providerId: string): Promise<void> => {
    app.setMode("idle");
    try {
      await props.onProviderSelect?.(providerId);
      app.setProvider(providerId);
      toast.success(`Provider changed to ${providerId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCascadeToggle = async (): Promise<void> => {
    const newValue = !app.cascadeEnabled();
    app.setCascadeEnabled(newValue);
    try {
      await props.onCascadeToggle?.(newValue);
      toast.success(`Cascade mode ${newValue ? "enabled" : "disabled"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      backgroundColor={theme.colors.background}
    >
      <Switch>
        <Match when={route.isHome()}>
          <Home
            onSubmit={handleSubmit}
            onCommand={handleCommand}
            onModelSelect={handleModelSelect}
            onThemeSelect={handleThemeSelect}
            onFileSelect={handleFileSelect}
            files={fileList()}
          />
        </Match>
        <Match when={route.isSession()}>
          <Session
            onSubmit={handleSubmit}
            onCommand={handleCommand}
            onModelSelect={handleModelSelect}
            onThemeSelect={handleThemeSelect}
            onAgentSelect={handleAgentSelect}
            onMCPSelect={handleMCPSelect}
            onMCPAdd={handleMCPAdd}
            onFileSelect={handleFileSelect}
            onProviderSelect={handleProviderSelect}
            onCascadeToggle={handleCascadeToggle}
            onPermissionResponse={handlePermissionResponse}
            onLearningResponse={handleLearningResponse}
            plan={props.plan}
            agents={props.agents}
            currentAgent={props.currentAgent}
            mcpServers={props.mcpServers}
            files={fileList()}
          />
        </Match>
      </Switch>
      <Toast />
    </box>
  );
}

function App(props: AppProps) {
  return (
    <ErrorBoundary fallback={(err: Error) => <ErrorFallback error={err} />}>
      <ExitProvider
        onExit={() => props.onExit({ exitCode: 0, sessionId: props.sessionId })}
      >
        <RouteProvider>
          <ToastProvider>
            <ThemeProvider>
              <AppStoreProvider>
                <KeybindProvider>
                  <DialogProvider>
                    <AppContent {...props} />
                  </DialogProvider>
                </KeybindProvider>
              </AppStoreProvider>
            </ThemeProvider>
          </ToastProvider>
        </RouteProvider>
      </ExitProvider>
    </ErrorBoundary>
  );
}

export interface TuiRenderOptions extends TuiInput {
  onSubmit: (input: string) => Promise<void>;
  onCommand: (command: string) => Promise<void>;
  onModelSelect: (model: string) => Promise<void>;
  onThemeSelect: (theme: string) => void;
  onAgentSelect?: (agentId: string) => Promise<void>;
  onMCPSelect?: (serverId: string) => Promise<void>;
  onMCPAdd?: (data: MCPAddFormData) => Promise<void>;
  onFileSelect?: (file: string) => void;
  onProviderSelect?: (providerId: string) => Promise<void>;
  onCascadeToggle?: (enabled: boolean) => Promise<void>;
  onPermissionResponse: (allowed: boolean, scope?: PermissionScope) => void;
  onLearningResponse: (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ) => void;
  plan?: {
    id: string;
    title: string;
    items: Array<{ id: string; text: string; completed: boolean }>;
  } | null;
  agents?: AgentOption[];
  currentAgent?: string;
  mcpServers?: MCPServer[];
  files?: string[];
}

export function tui(options: TuiRenderOptions): Promise<TuiOutput> {
  return new Promise<TuiOutput>((resolve) => {
    render(() => <App {...options} onExit={resolve} />, {
      targetFps: 60,
      exitOnCtrlC: false,
      useKittyKeyboard: {},
      useMouse: false,
    });
  });
}

export { appStore } from "@tui-solid/context/app";
