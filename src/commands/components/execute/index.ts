import { debugLog } from "@utils/debug-logger";
import { renderApp, appStore } from "@commands/components/execute/execute";
import type { RenderAppProps } from "@commands/components/execute/execute";
import {
  initializeChatService,
  loadModels,
  handleModelSelect as serviceHandleModelSelect,
  executePrintMode,
  setupPermissionHandler,
  cleanupPermissionHandler,
  setupQuestionHandler,
  executeCommand,
  handleMessage,
} from "@services/chat-tui-service";
import type { ChatServiceState } from "@services/chat-tui-service";
import type { ChatTUIOptions } from "@interfaces/ChatTUIOptions";
import type { AgentConfig } from "@/types/agent-config";
import { getConfig } from "@services/core/config";
import { getThinkingMessage } from "@constants/status-messages";
import { enterFullscreen, registerExitHandlers } from "@utils/core/terminal";
import { createCallbacks } from "@commands/chat-tui";
import { agentLoader } from "@services/agent-loader";
import { projectSetupService } from "@services/project-setup-service";

interface ExecuteContext {
  state: ChatServiceState | null;
  baseSystemPrompt: string | null;
}

const createHandleExit = (): (() => void) => (): void => {
  debugLog("execute",
    "[execute] handleExit called - cleaning up permissions and exiting",
  );
  cleanupPermissionHandler();
  // Note: Session stats are displayed by the TUI exit handler in app.tsx
  // The TUI handles terminal cleanup and draining stdin before exit
  process.exit(0);
};

const createHandleModelSelect =
  (ctx: ExecuteContext) =>
  async (model: string): Promise<void> => {
    debugLog("execute", "handleModelSelect called:", model);
    if (!ctx.state) {
      debugLog("execute", "handleModelSelect: no state available");
      return;
    }
    await serviceHandleModelSelect(ctx.state, model, createCallbacks());
    debugLog("execute", "handleModelSelect: completed for model", model);
  };

const createHandleAgentSelect =
  (ctx: ExecuteContext) =>
  async (agentId: string, agent: AgentConfig): Promise<void> => {
    debugLog("execute", "handleAgentSelect called:", agentId, agent?.name);
    if (!ctx.state) {
      debugLog("execute", "handleAgentSelect: no state available");
      return;
    }

    (ctx.state as ChatServiceState & { currentAgent?: string }).currentAgent =
      agentId;

    // Use the stored base prompt to avoid accumulation when switching agents
    const basePrompt = ctx.baseSystemPrompt ?? ctx.state.systemPrompt;

    if (agent.prompt) {
      ctx.state.systemPrompt = `${agent.prompt}\n\n${basePrompt}`;
      debugLog("execute",
        "[execute] handleAgentSelect: applied agent prompt, new systemPrompt set",
      );
    } else {
      // Reset to base prompt if agent has no custom prompt
      ctx.state.systemPrompt = basePrompt;
      debugLog("execute",
        "[execute] handleAgentSelect: agent has no custom prompt, reset to base",
      );
    }

    // Update the system message in the conversation
    if (
      ctx.state.messages.length > 0 &&
      ctx.state.messages[0].role === "system"
    ) {
      ctx.state.messages[0].content = ctx.state.systemPrompt;
      debugLog("execute", "handleAgentSelect: updated first system message");
    }
  };

const createHandleThemeSelect =
  () =>
  (themeName: string): void => {
    debugLog("execute", "handleThemeSelect called:", themeName);
    getConfig().then((config) => {
      config.set("theme", themeName);
      config.save();
      debugLog("execute", "handleThemeSelect: theme saved:", themeName);
    });
  };

const createHandleProviderSelect =
  (ctx: ExecuteContext) =>
  async (providerId: string): Promise<void> => {
    debugLog("execute", "handleProviderSelect called:", providerId);
    if (!ctx.state) {
      debugLog("execute", "handleProviderSelect: no state available");
      return;
    }
    ctx.state.provider = providerId as "copilot" | "ollama";
    const config = await getConfig();
    config.set("provider", providerId as "copilot" | "ollama");
    await config.save();
    debugLog("execute",
      "[execute] handleProviderSelect: provider saved to config",
      providerId,
    );

    // Load models for the new provider and update the store
    const models = await loadModels(providerId as "copilot" | "ollama");
    appStore.setAvailableModels(models);
    debugLog("execute",
      "[execute] handleProviderSelect: loaded models for provider",
      providerId,
      "models count:",
      models.length,
    );

    // If Ollama is selected and has models, open model selector
    if (providerId === "ollama" && models.length > 0) {
      appStore.setMode("model_select");
      debugLog("execute", "handleProviderSelect: set mode to model_select");
    }
  };

const createHandleCascadeToggle =
  () =>
  async (enabled: boolean): Promise<void> => {
    debugLog("execute", "handleCascadeToggle called:", enabled);
    const config = await getConfig();
    config.set("cascadeEnabled", enabled);
    await config.save();
    debugLog("execute",
      "[execute] handleCascadeToggle: cascadeEnabled saved:",
      enabled,
    );
  };

const createHandleCommand =
  (ctx: ExecuteContext, handleExit: () => void) =>
  async (command: string): Promise<void> => {
    debugLog("execute", "handleCommand called:", command);
    if (!ctx.state) {
      debugLog("execute", "handleCommand: no state available");
      return;
    }

    if (["exit", "quit", "q"].includes(command.toLowerCase())) {
      debugLog("execute",
        "[execute] handleCommand: exit command received, calling handleExit",
      );
      handleExit();
      return;
    }

    await executeCommand(ctx.state, command, createCallbacks());
    debugLog("execute",
      "[execute] handleCommand: executeCommand completed for",
      command,
    );
  };

const createHandleSubmit =
  (ctx: ExecuteContext, handleCommand: (command: string) => Promise<void>) =>
  async (message: string): Promise<void> => {
    debugLog("execute", "handleSubmit called:", message);
    if (!ctx.state) {
      debugLog("execute", "handleSubmit: no state available");
      return;
    }

    if (message.startsWith("/")) {
      const [command] = message.slice(1).split(/\s+/);
      debugLog("execute", "handleSubmit: detected slash command:", command);
      await handleCommand(command);
      return;
    }

    // Set initial thinking message (streaming will update this)
    appStore.setThinkingMessage(getThinkingMessage());
    debugLog("execute", "handleSubmit: thinking message set");

    try {
      await handleMessage(ctx.state, message, createCallbacks());
      debugLog("execute", "handleSubmit: handleMessage completed");
    } finally {
      // Clean up any remaining state after message handling
      appStore.setThinkingMessage(null);
      appStore.setCurrentToolCall(null);
      appStore.setMode("idle");
      debugLog("execute",
        "[execute] handleSubmit: cleaned up thinking state and set mode to idle",
      );
    }
  };

const execute = async (options: ChatTUIOptions): Promise<void> => {
  debugLog("execute", "starting with options:", options);
  const ctx: ExecuteContext = {
    state: null,
    baseSystemPrompt: null,
  };

  // Setup project on startup (add .codetyper to gitignore, create default agents)
  debugLog("execute", "running project setup");
  await projectSetupService.setupProject(process.cwd());
  debugLog("execute", "project setup complete");

  const { state, session } = await initializeChatService(options);
  debugLog("execute", "initializeChatService returned session:", session?.id);
  ctx.state = state;
  // Store the original system prompt before any agent modifications
  ctx.baseSystemPrompt = state.systemPrompt;
  debugLog("execute", "stored base system prompt");

  if (options.printMode && options.initialPrompt) {
    debugLog("execute",
      "[execute] printMode enabled - executing print mode and exiting",
    );
    await executePrintMode(state, options.initialPrompt);
    return;
  }

  debugLog("execute", "setting up permission and question handlers");
  setupPermissionHandler();
  setupQuestionHandler();

  debugLog("execute", "loading models for provider:", state.provider);
  const models = await loadModels(state.provider);
  debugLog("execute", "models loaded, count:", models.length);

  debugLog("execute", "loading available agents");
  const agents = await agentLoader.getAvailableAgents(process.cwd());
  debugLog("execute", "agents loaded, count:", agents.length);

  const config = await getConfig();
  const savedTheme = config.get("theme");
  debugLog("execute", "config loaded, savedTheme:", savedTheme);

  // Register exit handlers to ensure terminal cleanup on abrupt termination
  debugLog("execute", "registering exit handlers and entering fullscreen");
  registerExitHandlers();
  enterFullscreen();

  const handleExit = createHandleExit();
  const handleModelSelectFn = createHandleModelSelect(ctx);
  const handleAgentSelectFn = createHandleAgentSelect(ctx);
  const handleThemeSelectFn = createHandleThemeSelect();
  const handleProviderSelectFn = createHandleProviderSelect(ctx);
  const handleCascadeToggleFn = createHandleCascadeToggle();
  const handleCommand = createHandleCommand(ctx, handleExit);
  const handleSubmit = createHandleSubmit(ctx, handleCommand);

  debugLog("execute", "handlers created");

  const savedCascadeEnabled = config.get("cascadeEnabled");
  debugLog("execute", "cascadeEnabled from config:", savedCascadeEnabled);

  const renderProps: RenderAppProps = {
    sessionId: session.id,
    handleSubmit,
    handleCommand,
    handleModelSelect: handleModelSelectFn,
    handleAgentSelect: handleAgentSelectFn,
    handleThemeSelect: handleThemeSelectFn,
    handleProviderSelect: handleProviderSelectFn,
    handleCascadeToggle: handleCascadeToggleFn,
    handleExit,
    showBanner: true,
    state,
    availableModels: models,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
    })),
    initialPrompt: options.initialPrompt,
    theme: savedTheme,
    cascadeEnabled: savedCascadeEnabled ?? true,
  };

  debugLog("execute", "calling renderApp with renderProps");
  await renderApp(renderProps);
  debugLog("execute", "renderApp completed");
};

export default execute;
