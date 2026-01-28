import { renderApp, appStore } from "@commands/components/execute/execute";
import type { RenderAppProps } from "@commands/components/execute/execute";
import {
  initializeChatService,
  loadModels,
  handleModelSelect as serviceHandleModelSelect,
  executePrintMode,
  setupPermissionHandler,
  cleanupPermissionHandler,
  executeCommand,
  handleMessage,
} from "@services/chat-tui-service";
import type { ChatServiceState } from "@services/chat-tui-service";
import type { ChatTUIOptions } from "@interfaces/ChatTUIOptions";
import type { AgentConfig } from "@/types/agent-config";
import { getConfig } from "@services/config";
import { getThinkingMessage } from "@constants/status-messages";
import {
  enterFullscreen,
  registerExitHandlers,
  exitFullscreen,
  clearScreen,
} from "@utils/terminal";
import { createCallbacks } from "@commands/chat-tui";
import { agentLoader } from "@services/agent-loader";

interface ExecuteContext {
  state: ChatServiceState | null;
}

const createHandleExit = (): (() => void) => (): void => {
  cleanupPermissionHandler();
  exitFullscreen();
  clearScreen();
  console.log("Goodbye!");
  process.exit(0);
};

const createHandleModelSelect =
  (ctx: ExecuteContext) =>
  async (model: string): Promise<void> => {
    if (!ctx.state) return;
    await serviceHandleModelSelect(ctx.state, model, createCallbacks());
  };

const createHandleAgentSelect =
  (ctx: ExecuteContext) =>
  async (agentId: string, agent: AgentConfig): Promise<void> => {
    if (!ctx.state) return;

    (ctx.state as ChatServiceState & { currentAgent?: string }).currentAgent =
      agentId;

    if (agent.prompt) {
      const basePrompt = ctx.state.systemPrompt;
      ctx.state.systemPrompt = `${agent.prompt}\n\n${basePrompt}`;

      if (
        ctx.state.messages.length > 0 &&
        ctx.state.messages[0].role === "system"
      ) {
        ctx.state.messages[0].content = ctx.state.systemPrompt;
      }
    }
  };

const createHandleThemeSelect =
  () =>
  (themeName: string): void => {
    getConfig().then((config) => {
      config.set("theme", themeName);
      config.save();
    });
  };

const createHandleProviderSelect =
  (ctx: ExecuteContext) =>
  async (providerId: string): Promise<void> => {
    if (!ctx.state) return;
    ctx.state.provider = providerId as "copilot" | "ollama";
    const config = await getConfig();
    config.set("provider", providerId as "copilot" | "ollama");
    await config.save();
  };

const createHandleCascadeToggle =
  () =>
  async (enabled: boolean): Promise<void> => {
    const config = await getConfig();
    config.set("cascadeEnabled", enabled);
    await config.save();
  };

const createHandleCommand =
  (ctx: ExecuteContext, handleExit: () => void) =>
  async (command: string): Promise<void> => {
    if (!ctx.state) return;

    if (["exit", "quit", "q"].includes(command.toLowerCase())) {
      handleExit();
      return;
    }

    await executeCommand(ctx.state, command, createCallbacks());
  };

const createHandleSubmit =
  (ctx: ExecuteContext, handleCommand: (command: string) => Promise<void>) =>
  async (message: string): Promise<void> => {
    if (!ctx.state) return;

    if (message.startsWith("/")) {
      const [command] = message.slice(1).split(/\s+/);
      await handleCommand(command);
      return;
    }

    // Set initial thinking message (streaming will update this)
    appStore.setThinkingMessage(getThinkingMessage());

    try {
      await handleMessage(ctx.state, message, createCallbacks());
    } finally {
      // Clean up any remaining state after message handling
      appStore.setThinkingMessage(null);
      appStore.setCurrentToolCall(null);
      appStore.setMode("idle");
    }
  };

const execute = async (options: ChatTUIOptions): Promise<void> => {
  const ctx: ExecuteContext = {
    state: null,
  };

  const { state, session } = await initializeChatService(options);
  ctx.state = state;

  if (options.printMode && options.initialPrompt) {
    await executePrintMode(state, options.initialPrompt);
    return;
  }

  setupPermissionHandler();

  const models = await loadModels(state.provider);
  const agents = await agentLoader.getAvailableAgents(process.cwd());
  const config = await getConfig();
  const savedTheme = config.get("theme");

  // Register exit handlers to ensure terminal cleanup on abrupt termination
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

  // Only pass sessionId if resuming/continuing - otherwise show Home view first
  const isResuming = options.continueSession || options.resumeSession;

  const savedCascadeEnabled = config.get("cascadeEnabled");

  const renderProps: RenderAppProps = {
    sessionId: isResuming ? session.id : undefined,
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

  await renderApp(renderProps);
};

export default execute;
