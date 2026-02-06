import { render, useKeyboard, useRenderer } from "@opentui/solid";
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
import {
  abortCurrentOperation,
  togglePauseResume,
  setStepMode,
  advanceStep,
  getExecutionState,
} from "@services/chat-tui-service";
import { TERMINAL_RESET } from "@constants/terminal";
import { formatExitMessage } from "@services/exit-message";
import { copyToClipboard } from "@services/clipboard/text-clipboard";
import versionData from "@/version.json";
import { ExitProvider, useExit } from "@tui-solid/context/exit";
import { RouteProvider, useRoute } from "@tui-solid/context/route";
import {
  AppStoreProvider,
  useAppStore,
  setAppStoreRef,
  appStore,
} from "@tui-solid/context/app";
import { ThemeProvider, useTheme } from "@tui-solid/context/theme";
import { KeybindProvider } from "@tui-solid/context/keybind";
import { DialogProvider } from "@tui-solid/context/dialog";
import { ToastProvider, Toast, useToast } from "@tui-solid/ui/toast";
import { Home } from "@tui-solid/routes/home";
import { Session } from "@tui-solid/routes/session";
import type { TuiInput, TuiOutput } from "@interfaces/index";
import type { MCPServerDisplay } from "@/types/tui";
import type {
  PermissionScope,
  LearningScope,
  PlanApprovalPromptResponse,
} from "@/types/tui";
import type { MCPAddFormData } from "@/types/mcp";

interface AgentOption {
  id: string;
  name: string;
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
  onPlanApprovalResponse: (response: PlanApprovalPromptResponse) => void;
  onLearningResponse: (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ) => void;
  onBrainSetJwtToken?: (jwtToken: string) => Promise<void>;
  onBrainSetApiKey?: (apiKey: string) => Promise<void>;
  onBrainLogout?: () => Promise<void>;
  plan?: {
    id: string;
    title: string;
    items: Array<{ id: string; text: string; completed: boolean }>;
  } | null;
  agents?: AgentOption[];
  currentAgent?: string;
  mcpServers?: MCPServerDisplay[];
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
        Press Ctrl+C twice to exit
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
  const renderer = useRenderer();
  renderer.disableStdoutInterception();
  const [fileList, setFileList] = createSignal<string[]>([]);

  setAppStoreRef(app);

  /** Copy selected text to clipboard and clear selection */
  const copySelectionToClipboard = async (): Promise<void> => {
    const text = renderer.getSelection()?.getSelectedText();
    if (text && text.length > 0) {
      await copyToClipboard(text)
        .then(() => toast.info("Copied to clipboard"))
        .catch(() => toast.error("Failed to copy to clipboard"));
      renderer.clearSelection();
    }
  };

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

  // Always navigate to session view (skip home page)
  // Use existing sessionId or create a new one
  if (!route.isSession()) {
    const sessionId = props.sessionId ?? `session-${Date.now()}`;
    batch(() => {
      app.setSessionInfo(sessionId, app.provider(), app.model());
      route.goToSession(sessionId);
    });
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
    // Ctrl+Y copies selected text to clipboard
    if (evt.ctrl && evt.name === "y") {
      copySelectionToClipboard();
      evt.preventDefault();
      return;
    }

    // ESC aborts current operation
    if (evt.name === "escape") {
      abortCurrentOperation(false).then((aborted) => {
        if (aborted) {
          toast.info("Operation cancelled");
        }
      });
      evt.preventDefault();
      return;
    }

    // Ctrl+P toggles pause/resume during execution
    if (evt.ctrl && evt.name === "p") {
      const toggled = togglePauseResume();
      if (toggled) {
        const state = getExecutionState();
        toast.info(
          state.state === "paused"
            ? "⏸ Execution paused"
            : "▶ Execution resumed",
        );
        evt.preventDefault();
        return;
      }
    }

    // Ctrl+Z aborts with rollback
    if (evt.ctrl && evt.name === "z") {
      const state = getExecutionState();
      if (state.state !== "idle") {
        abortCurrentOperation(true).then((aborted) => {
          if (aborted) {
            toast.info(
              `Aborted with rollback of ${state.rollbackCount} action(s)`,
            );
          }
        });
        evt.preventDefault();
        return;
      }
    }

    // Ctrl+Shift+S toggles step mode
    if (evt.ctrl && evt.shift && evt.name === "s") {
      const state = getExecutionState();
      if (state.state !== "idle") {
        const isStepMode = state.state === "stepping";
        setStepMode(!isStepMode);
        toast.info(
          isStepMode ? "🏃 Step mode disabled" : "🚶 Step mode enabled",
        );
        evt.preventDefault();
        return;
      }
    }

    // Enter advances step when waiting for step confirmation
    if (evt.name === "return" && !evt.ctrl && !evt.shift) {
      const state = getExecutionState();
      if (state.waitingForStep) {
        advanceStep();
        evt.preventDefault();
        return;
      }
    }

    // Ctrl+C exits the application (with confirmation)
    if (evt.ctrl && evt.name === "c") {
      // First try to abort current operation
      const state = getExecutionState();
      if (state.state !== "idle") {
        abortCurrentOperation(false).then(() => {
          toast.info("Operation cancelled. Press Ctrl+C again to exit.");
        });
        evt.preventDefault();
        return;
      }

      if (app.interruptPending()) {
        exit.exit(0);
        evt.preventDefault();
        return;
      }

      app.setInterruptPending(true);
      toast.warning("Press Ctrl+C again to exit");
      setTimeout(() => {
        app.setInterruptPending(false);
      }, 2000);
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

  const handlePlanApprovalResponse = (
    response: PlanApprovalPromptResponse,
  ): void => {
    // Don't set mode here - the resolve callback in plan-approval.ts
    // handles the mode transition
    props.onPlanApprovalResponse(response);
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
      onMouseUp={() => copySelectionToClipboard()}
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
            onPlanApprovalResponse={handlePlanApprovalResponse}
            onLearningResponse={handleLearningResponse}
            onBrainSetJwtToken={props.onBrainSetJwtToken}
            onBrainSetApiKey={props.onBrainSetApiKey}
            onBrainLogout={props.onBrainLogout}
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
  onPlanApprovalResponse: (response: PlanApprovalPromptResponse) => void;
  onLearningResponse: (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ) => void;
  onBrainSetJwtToken?: (jwtToken: string) => Promise<void>;
  onBrainSetApiKey?: (apiKey: string) => Promise<void>;
  onBrainLogout?: () => Promise<void>;
  plan?: {
    id: string;
    title: string;
    items: Array<{ id: string; text: string; completed: boolean }>;
  } | null;
  agents?: AgentOption[];
  currentAgent?: string;
  mcpServers?: MCPServerDisplay[];
  files?: string[];
}

export function tui(options: TuiRenderOptions): Promise<TuiOutput> {
  return new Promise<TuiOutput>((resolve) => {
    const { writeSync } = require("fs");

    const handleExit = (output: TuiOutput): void => {
      try {
        writeSync(1, TERMINAL_RESET);

        const state = appStore.getState();
        const firstUserLog = state?.logs?.find(
          (log: { type: string }) => log.type === "user",
        );
        const sessionTitle = firstUserLog?.content;
        const exitMsg = formatExitMessage(output.sessionId, sessionTitle);
        if (exitMsg) {
          writeSync(1, exitMsg);
        }
      } catch {
        // Ignore - stdout may already be closed
      }
      resolve(output);
    };

    render(() => <App {...options} onExit={handleExit} />, {
      targetFps: 60,
      exitOnCtrlC: false,
      useKittyKeyboard: {},
    });
  });
}
