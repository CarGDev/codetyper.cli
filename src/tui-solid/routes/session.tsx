import { Show, Switch, Match } from "solid-js";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { Header } from "@tui-solid/components/header";
import { LogPanel } from "@tui-solid/components/log-panel";
import { InputArea } from "@tui-solid/components/input-area";
import { StatusBar } from "@tui-solid/components/status-bar";
import { CommandMenu } from "@tui-solid/components/command-menu";
import { ModelSelect } from "@tui-solid/components/model-select";
import { ThemeSelect } from "@tui-solid/components/theme-select";
import { AgentSelect } from "@tui-solid/components/agent-select";
import { MCPSelect } from "@tui-solid/components/mcp-select";
import { MCPAddForm } from "@tui-solid/components/mcp-add-form";
import { ModeSelect } from "@tui-solid/components/mode-select";
import { ProviderSelect } from "@tui-solid/components/provider-select";
import { FilePicker } from "@tui-solid/components/file-picker";
import { PermissionModal } from "@tui-solid/components/permission-modal";
import { LearningModal } from "@tui-solid/components/learning-modal";
import { TodoPanel } from "@tui-solid/components/todo-panel";
import type { PermissionScope, LearningScope, InteractionMode } from "@/types/tui";
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
  providerStatuses?: Record<string, ProviderStatus>;
  providerScores?: Record<string, number>;
}

export function Session(props: SessionProps) {
  const theme = useTheme();
  const app = useAppStore();

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

  const handleProviderSelect = (providerId: string): void => {
    app.setProvider(providerId);
    props.onProviderSelect?.(providerId);
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
      </box>

      <StatusBar />
      <InputArea onSubmit={props.onSubmit} />

      <Switch>
        <Match when={app.mode() === "command_menu"}>
          <box position="absolute" top={3} left={2}>
            <CommandMenu
              onSelect={handleCommandSelect}
              onCancel={handleCommandCancel}
              isActive={app.mode() === "command_menu"}
            />
          </box>
        </Match>

        <Match when={app.mode() === "model_select"}>
          <box position="absolute" top={3} left={2}>
            <ModelSelect
              onSelect={props.onModelSelect}
              onClose={handleModelClose}
              isActive={app.mode() === "model_select"}
            />
          </box>
        </Match>

        <Match when={app.mode() === "theme_select"}>
          <box position="absolute" top={3} left={2}>
            <ThemeSelect
              onSelect={props.onThemeSelect}
              onClose={handleThemeClose}
              isActive={app.mode() === "theme_select"}
            />
          </box>
        </Match>

        <Match when={app.mode() === "agent_select" && props.agents}>
          <box position="absolute" top={3} left={2}>
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
          </box>
        </Match>

        <Match when={app.mode() === "mcp_select"}>
          <box position="absolute" top={3} left={2}>
            <MCPSelect
              servers={props.mcpServers ?? []}
              onSelect={props.onMCPSelect}
              onAddNew={handleMCPAddNew}
              onClose={handleMCPClose}
              isActive={app.mode() === "mcp_select"}
            />
          </box>
        </Match>

        <Match when={app.mode() === "mcp_add"}>
          <box position="absolute" top={3} left={2}>
            <MCPAddForm
              onSubmit={props.onMCPAdd}
              onClose={handleMCPAddClose}
              isActive={app.mode() === "mcp_add"}
            />
          </box>
        </Match>

        <Match when={app.mode() === "mode_select"}>
          <box position="absolute" top={3} left={2}>
            <ModeSelect
              onSelect={handleModeSelect}
              onClose={handleModeClose}
              isActive={app.mode() === "mode_select"}
            />
          </box>
        </Match>

        <Match when={app.mode() === "provider_select"}>
          <box position="absolute" top={3} left={2}>
            <ProviderSelect
              onSelect={handleProviderSelect}
              onClose={handleProviderClose}
              onToggleCascade={handleToggleCascade}
              isActive={app.mode() === "provider_select"}
              cascadeEnabled={app.cascadeEnabled()}
              providerStatuses={props.providerStatuses}
              providerScores={props.providerScores}
            />
          </box>
        </Match>

        <Match when={app.mode() === "file_picker"}>
          <box position="absolute" top={3} left={2}>
            <FilePicker
              files={props.files ?? []}
              onSelect={props.onFileSelect}
              onClose={handleFilePickerClose}
              isActive={app.mode() === "file_picker"}
            />
          </box>
        </Match>

        <Match
          when={app.mode() === "permission_prompt" && app.permissionRequest()}
        >
          <box position="absolute" top={3} left={2}>
            <PermissionModal
              request={app.permissionRequest()!}
              onRespond={props.onPermissionResponse}
              isActive={app.mode() === "permission_prompt"}
            />
          </box>
        </Match>

        <Match when={app.mode() === "learning_prompt" && app.learningPrompt()}>
          <box position="absolute" top={3} left={2}>
            <LearningModal
              prompt={app.learningPrompt()!}
              onRespond={props.onLearningResponse}
              isActive={app.mode() === "learning_prompt"}
            />
          </box>
        </Match>
      </Switch>
    </box>
  );
}
