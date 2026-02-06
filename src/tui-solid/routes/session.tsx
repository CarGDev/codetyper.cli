import {
  Show,
  Switch,
  Match,
  createSignal,
  createMemo,
  onMount,
} from "solid-js";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { Header } from "@tui-solid/components/layout/header";
import { LogPanel } from "@tui-solid/components/logs/log-panel";
import { InputArea } from "@tui-solid/components/inputs/input-area";
import { StatusBar } from "@tui-solid/components/layout/status-bar";
import { CommandMenu } from "@tui-solid/components/menu/command-menu";
import { ModelSelect } from "@tui-solid/components/submenu/model-select";
import { ThemeSelect } from "@tui-solid/components/submenu/theme-select";
import { AgentSelect } from "@tui-solid/components/submenu/agent-select";
import { MCPSelect } from "@tui-solid/components/submenu/mcp-select";
import { MCPAddForm } from "@tui-solid/components/inputs/mcp-add-form";
import { ModeSelect } from "@tui-solid/components/submenu/mode-select";
import { ProviderSelect } from "@tui-solid/components/submenu/provider-select";
import { FilePicker } from "@tui-solid/components/inputs/file-picker";
import { PermissionModal } from "@tui-solid/components/modals/permission-modal";
import { PlanApprovalModal } from "@tui-solid/components/modals/plan-approval-modal";
import { LearningModal } from "@tui-solid/components/modals/learning-modal";
import { HelpMenu } from "@tui-solid/components/menu/help-menu";
import { HelpDetail } from "@tui-solid/components/panels/help-detail";
import { TodoPanel } from "@tui-solid/components/panels/todo-panel";
import { CenteredModal } from "@tui-solid/components/modals/centered-modal";
import { DebugLogPanel } from "@tui-solid/components/logs/debug-log-panel";
import { BrainMenu } from "@tui-solid/components/menu/brain-menu";
import { BRAIN_DISABLED } from "@constants/brain";
import { initializeMCP, getServerInstances } from "@services/mcp/manager";
import type {
  PermissionScope,
  LearningScope,
  InteractionMode,
  MCPServerDisplay,
  PlanApprovalPromptResponse,
} from "@/types/tui";
import type { MCPAddFormData } from "@/types/mcp";

interface AgentOption {
  id: string;
  name: string;
  description?: string;
}

interface ProviderStatus {
  available: boolean;
  error?: string;
  lastChecked: number;
}

interface SessionProps {
  onSubmit: (input: string) => void;
  onCommand: (command: string) => void;
  onModelSelect: (model: string) => void;
  onThemeSelect: (theme: string) => void;
  onAgentSelect: (agentId: string) => void;
  onMCPSelect: (serverId: string) => void;
  onMCPAdd: (data: MCPAddFormData) => void;
  onFileSelect: (file: string) => void;
  onProviderSelect?: (providerId: string) => void;
  onCascadeToggle?: () => void;
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
  providerStatuses?: Record<string, ProviderStatus>;
  providerScores?: Record<string, number>;
}

export function Session(props: SessionProps) {
  const theme = useTheme();
  const app = useAppStore();

  // Initialize MCP servers from config on mount
  onMount(async () => {
    // First set any servers passed as props
    if (props.mcpServers && props.mcpServers.length > 0) {
      app.setMcpServers(props.mcpServers);
    }

    // Then load servers from config file
    try {
      await initializeMCP();
      const instances = getServerInstances();
      const servers: MCPServerDisplay[] = [];

      for (const [id, instance] of instances) {
        servers.push({
          id,
          name: instance.config.name || id,
          status:
            instance.state === "connected"
              ? "connected"
              : instance.state === "error"
                ? "error"
                : "disconnected",
          description: instance.config.command,
        });
      }

      if (servers.length > 0) {
        app.setMcpServers(servers);
      }
    } catch {
      // Silently fail - MCP is optional
    }
  });

  // Use store's mcpServers (reactive, updated when servers are added)
  const mcpServers = createMemo(() => app.mcpServers());

  // Local state for help menu
  const [selectedHelpTopic, setSelectedHelpTopic] = createSignal<string | null>(
    null,
  );

  const handleCommandSelect = (command: string): void => {
    const lowerCommand = command.toLowerCase();
    // Handle menu-opening commands directly to avoid async timing issues
    if (lowerCommand === "model" || lowerCommand === "models") {
      app.transitionFromCommandMenu("model_select");
      return;
    }
    if (lowerCommand === "theme") {
      app.transitionFromCommandMenu("theme_select");
      return;
    }
    if (lowerCommand === "agent" || lowerCommand === "a") {
      app.transitionFromCommandMenu("agent_select");
      return;
    }
    if (lowerCommand === "mcp") {
      app.transitionFromCommandMenu("mcp_select");
      return;
    }
    if (lowerCommand === "mode") {
      app.transitionFromCommandMenu("mode_select");
      return;
    }
    if (lowerCommand === "provider" || lowerCommand === "p") {
      app.transitionFromCommandMenu("provider_select");
      return;
    }
    if (
      lowerCommand === "help" ||
      lowerCommand === "h" ||
      lowerCommand === "?"
    ) {
      app.transitionFromCommandMenu("help_menu");
      return;
    }
    if (lowerCommand === "brain" && !BRAIN_DISABLED) {
      app.transitionFromCommandMenu("brain_menu");
      return;
    }
    // For other commands, close menu and process through handler
    app.closeCommandMenu();
    props.onCommand(command);
  };

  const handleCommandCancel = (): void => {
    app.closeCommandMenu();
  };

  const handleModelClose = (): void => {
    app.setMode("idle");
  };

  const handleThemeClose = (): void => {
    app.setMode("idle");
  };

  const handleAgentClose = (): void => {
    app.setMode("idle");
  };

  const handleMCPClose = (): void => {
    app.setMode("idle");
  };

  const handleMCPAddNew = (): void => {
    app.setMode("mcp_add");
  };

  const handleMCPAddClose = (): void => {
    app.setMode("idle");
  };

  const handleModeSelect = (mode: InteractionMode): void => {
    app.setInteractionMode(mode);
  };

  const handleModeClose = (): void => {
    app.setMode("idle");
  };

  const handleProviderSelect = async (providerId: string): Promise<void> => {
    app.setProvider(providerId);
    await props.onProviderSelect?.(providerId);
  };

  const handleProviderClose = (): void => {
    app.setMode("idle");
  };

  const handleToggleCascade = (): void => {
    app.toggleCascadeEnabled();
    props.onCascadeToggle?.();
  };

  const handleFilePickerClose = (): void => {
    app.setMode("idle");
  };

  const handleHelpTopicSelect = (topicId: string): void => {
    setSelectedHelpTopic(topicId);
    app.setMode("help_detail");
  };

  const handleHelpMenuClose = (): void => {
    setSelectedHelpTopic(null);
    app.setMode("idle");
  };

  const handleHelpDetailBack = (): void => {
    setSelectedHelpTopic(null);
    app.setMode("help_menu");
  };

  const handleHelpDetailClose = (): void => {
    setSelectedHelpTopic(null);
    app.setMode("idle");
  };

  const handleBrainMenuClose = (): void => {
    app.setMode("idle");
  };

  const handleBrainSetJwtToken = async (jwtToken: string): Promise<void> => {
    await props.onBrainSetJwtToken?.(jwtToken);
  };

  const handleBrainSetApiKey = async (apiKey: string): Promise<void> => {
    await props.onBrainSetApiKey?.(apiKey);
  };

  const handleBrainLogout = async (): Promise<void> => {
    await props.onBrainLogout?.();
  };

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      backgroundColor={theme.colors.background}
    >
      <Header />

      <box flexDirection="row" flexGrow={1}>
        <box flexDirection="column" flexGrow={1}>
          <LogPanel />
        </box>

        <Show when={app.todosVisible() && props.plan}>
          <TodoPanel plan={props.plan ?? null} visible={app.todosVisible()} />
        </Show>

        <Show when={app.debugLogVisible()}>
          <DebugLogPanel />
        </Show>
      </box>

      <Show
        when={app.mode() === "permission_prompt" && app.permissionRequest()}
      >
        <PermissionModal
          request={app.permissionRequest()!}
          onRespond={props.onPermissionResponse}
          isActive={app.mode() === "permission_prompt"}
        />
      </Show>

      <Show
        when={app.mode() === "plan_approval" && app.planApprovalPrompt()}
      >
        <PlanApprovalModal
          prompt={app.planApprovalPrompt()!}
          onRespond={props.onPlanApprovalResponse}
          isActive={app.mode() === "plan_approval"}
        />
      </Show>

      <StatusBar />
      <Show when={app.mode() !== "permission_prompt" && app.mode() !== "plan_approval"}>
        <InputArea onSubmit={props.onSubmit} />
      </Show>

      <Switch>
        <Match when={app.mode() === "command_menu"}>
          <CenteredModal>
            <CommandMenu
              onSelect={handleCommandSelect}
              onCancel={handleCommandCancel}
              isActive={app.mode() === "command_menu"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "model_select"}>
          <CenteredModal>
            <ModelSelect
              onSelect={props.onModelSelect}
              onClose={handleModelClose}
              isActive={app.mode() === "model_select"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "theme_select"}>
          <CenteredModal>
            <ThemeSelect
              onSelect={props.onThemeSelect}
              onClose={handleThemeClose}
              isActive={app.mode() === "theme_select"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "agent_select" && props.agents}>
          <CenteredModal>
            <AgentSelect
              agents={props.agents ?? []}
              currentAgent={app.currentAgent()}
              onSelect={(agentId) => {
                app.setCurrentAgent(agentId);
                props.onAgentSelect(agentId);
              }}
              onClose={handleAgentClose}
              isActive={app.mode() === "agent_select"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "mcp_select"}>
          <CenteredModal>
            <MCPSelect
              servers={mcpServers()}
              onSelect={props.onMCPSelect}
              onAddNew={handleMCPAddNew}
              onClose={handleMCPClose}
              isActive={app.mode() === "mcp_select"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "mcp_add"}>
          <CenteredModal>
            <MCPAddForm
              onSubmit={props.onMCPAdd}
              onClose={handleMCPAddClose}
              isActive={app.mode() === "mcp_add"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "mode_select"}>
          <CenteredModal>
            <ModeSelect
              onSelect={handleModeSelect}
              onClose={handleModeClose}
              isActive={app.mode() === "mode_select"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "provider_select"}>
          <CenteredModal>
            <ProviderSelect
              onSelect={handleProviderSelect}
              onClose={handleProviderClose}
              onToggleCascade={handleToggleCascade}
              isActive={app.mode() === "provider_select"}
              cascadeEnabled={app.cascadeEnabled()}
              providerStatuses={props.providerStatuses}
              providerScores={props.providerScores}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "file_picker"}>
          <CenteredModal>
            <FilePicker
              files={props.files ?? []}
              onSelect={props.onFileSelect}
              onClose={handleFilePickerClose}
              isActive={app.mode() === "file_picker"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "learning_prompt" && app.learningPrompt()}>
          <CenteredModal>
            <LearningModal
              prompt={app.learningPrompt()!}
              onRespond={props.onLearningResponse}
              isActive={app.mode() === "learning_prompt"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "help_menu"}>
          <CenteredModal>
            <HelpMenu
              onSelectTopic={handleHelpTopicSelect}
              onClose={handleHelpMenuClose}
              isActive={app.mode() === "help_menu"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "help_detail" && selectedHelpTopic()}>
          <CenteredModal>
            <HelpDetail
              topicId={selectedHelpTopic()!}
              onBack={handleHelpDetailBack}
              onClose={handleHelpDetailClose}
              isActive={app.mode() === "help_detail"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "brain_menu" && !BRAIN_DISABLED}>
          <CenteredModal>
            <BrainMenu
              onSetJwtToken={handleBrainSetJwtToken}
              onSetApiKey={handleBrainSetApiKey}
              onLogout={handleBrainLogout}
              onClose={handleBrainMenuClose}
              isActive={app.mode() === "brain_menu"}
            />
          </CenteredModal>
        </Match>
      </Switch>
    </box>
  );
}
