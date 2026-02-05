import { tui } from "@tui-solid/app";
import { appStore } from "@tui-solid/context/app";
import { getProviderInfo } from "@services/chat-tui-service";
import { addServer, connectServer } from "@services/mcp/manager";
import * as brainService from "@services/brain";
import type { ChatServiceState } from "@services/chat-tui-service";
import type { AgentConfig } from "@/types/agent-config";
import type { PermissionScope, LearningScope } from "@/types/tui";
import type { ProviderModel } from "@/types/providers";
import type { MCPAddFormData } from "@/types/mcp";

interface AgentOption {
  id: string;
  name: string;
  description?: string;
}

export interface RenderAppProps {
  sessionId?: string;
  handleSubmit: (message: string) => Promise<void>;
  handleCommand: (command: string) => Promise<void>;
  handleModelSelect: (model: string) => Promise<void>;
  handleAgentSelect: (agentId: string, agent: AgentConfig) => Promise<void>;
  handleThemeSelect: (theme: string) => void;
  handleProviderSelect?: (providerId: string) => Promise<void>;
  handleCascadeToggle?: (enabled: boolean) => Promise<void>;
  handleMCPAdd?: (data: MCPAddFormData) => Promise<void>;
  handlePermissionResponse?: (
    allowed: boolean,
    scope?: PermissionScope,
  ) => void;
  handleLearningResponse?: (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ) => void;
  handleBrainSetJwtToken?: (jwtToken: string) => Promise<void>;
  handleBrainSetApiKey?: (apiKey: string) => Promise<void>;
  handleBrainLogout?: () => Promise<void>;
  handleExit: () => void;
  showBanner: boolean;
  state: ChatServiceState;
  availableModels?: ProviderModel[];
  agents?: AgentOption[];
  initialPrompt?: string;
  theme?: string;
  cascadeEnabled?: boolean;
  plan?: {
    id: string;
    title: string;
    items: Array<{ id: string; text: string; completed: boolean }>;
  } | null;
}

/**
 * Parse arguments string, respecting quoted strings
 * Supports both single and double quotes for arguments with spaces
 * Example: '-y @modelcontextprotocol/server-filesystem "/path/with spaces"'
 */
const parseArgs = (argsString: string): string[] | undefined => {
  const trimmed = argsString.trim();
  if (!trimmed) return undefined;

  const args: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args.length > 0 ? args : undefined;
};

const defaultHandleMCPAdd = async (data: MCPAddFormData): Promise<void> => {
  const serverArgs = parseArgs(data.args);

  await addServer(
    data.name,
    {
      command: data.command,
      args: serverArgs,
      enabled: true,
    },
    data.isGlobal,
  );

  // Add to store with "connecting" status
  appStore.addMcpServer({
    id: data.name,
    name: data.name,
    status: "disconnected",
    description: data.command,
  });

  try {
    await connectServer(data.name);
    appStore.updateMcpServerStatus(data.name, "connected");
  } catch {
    appStore.updateMcpServerStatus(data.name, "error");
  }
};

const defaultHandleBrainSetJwtToken = async (
  jwtToken: string,
): Promise<void> => {
  await brainService.setJwtToken(jwtToken);
  const connected = await brainService.connect();
  if (connected) {
    const state = brainService.getState();
    appStore.setBrainStatus("connected");
    appStore.setBrainUser(state.user);
    appStore.setBrainCounts(state.knowledgeCount, state.memoryCount);
    appStore.setBrainShowBanner(false);
  } else {
    throw new Error("Failed to connect with the provided JWT token.");
  }
};

const defaultHandleBrainSetApiKey = async (apiKey: string): Promise<void> => {
  await brainService.setApiKey(apiKey);
  const connected = await brainService.connect();
  if (connected) {
    const state = brainService.getState();
    appStore.setBrainStatus("connected");
    appStore.setBrainUser(state.user);
    appStore.setBrainCounts(state.knowledgeCount, state.memoryCount);
    appStore.setBrainShowBanner(false);
  } else {
    throw new Error("Failed to connect with the provided API key.");
  }
};

const defaultHandleBrainLogout = async (): Promise<void> => {
  await brainService.logout();
  appStore.setBrainStatus("disconnected");
  appStore.setBrainUser(null);
  appStore.setBrainCounts(0, 0);
  appStore.setBrainShowBanner(true);
};

export const renderApp = async (props: RenderAppProps): Promise<void> => {
  const { displayName, model: defaultModel } = getProviderInfo(
    props.state.provider,
  );
  const currentModel = props.state.model ?? defaultModel;

  await tui({
    sessionId: props.sessionId,
    provider: displayName,
    model: currentModel,
    theme: props.theme,
    cascadeEnabled: props.cascadeEnabled,
    availableModels: props.availableModels,
    agents: props.agents,
    initialPrompt: props.initialPrompt,
    onSubmit: props.handleSubmit,
    onCommand: props.handleCommand,
    onModelSelect: props.handleModelSelect,
    onThemeSelect: props.handleThemeSelect,
    onProviderSelect: props.handleProviderSelect,
    onCascadeToggle: props.handleCascadeToggle,
    onAgentSelect: async (agentId: string) => {
      const agent = props.agents?.find((a) => a.id === agentId);
      if (agent) {
        await props.handleAgentSelect(agentId, agent as AgentConfig);
      }
    },
    onMCPAdd: props.handleMCPAdd ?? defaultHandleMCPAdd,
    onPermissionResponse: props.handlePermissionResponse ?? (() => {}),
    onLearningResponse: props.handleLearningResponse ?? (() => {}),
    onBrainSetJwtToken:
      props.handleBrainSetJwtToken ?? defaultHandleBrainSetJwtToken,
    onBrainSetApiKey: props.handleBrainSetApiKey ?? defaultHandleBrainSetApiKey,
    onBrainLogout: props.handleBrainLogout ?? defaultHandleBrainLogout,
    plan: props.plan,
  });

  props.handleExit();
};

export { appStore };
