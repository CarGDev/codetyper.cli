import { tui } from "@tui-solid/app";
import { getProviderInfo } from "@services/chat-tui-service";
import type { ChatServiceState } from "@services/chat-tui-service";
import type { AgentConfig } from "@/types/agent-config";
import type {
  PermissionScope,
  LearningScope,
  PlanApprovalPromptResponse,
} from "@/types/tui";

export interface RenderAppSolidProps {
  sessionId: string;
  handleSubmit: (message: string) => Promise<void>;
  handleCommand: (command: string) => Promise<void>;
  handleModelSelect: (model: string) => Promise<void>;
  handleAgentSelect: (agentId: string, agent: AgentConfig) => Promise<void>;
  handleThemeSelect: (theme: string) => void;
  handlePermissionResponse?: (
    allowed: boolean,
    scope?: PermissionScope,
  ) => void;
  handlePlanApprovalResponse?: (response: PlanApprovalPromptResponse) => void;
  handleLearningResponse?: (
    save: boolean,
    scope?: LearningScope,
    editedContent?: string,
  ) => void;
  handleExit: () => void;
  showBanner: boolean;
  state: ChatServiceState;
  plan?: {
    id: string;
    title: string;
    items: Array<{ id: string; text: string; completed: boolean }>;
  } | null;
}

export const renderAppSolid = async (
  props: RenderAppSolidProps,
): Promise<void> => {
  const { displayName, model: defaultModel } = getProviderInfo(
    props.state.provider,
  );
  const currentModel = props.state.model ?? defaultModel;

  await tui({
    sessionId: props.sessionId,
    provider: displayName,
    model: currentModel,
    onSubmit: props.handleSubmit,
    onCommand: props.handleCommand,
    onModelSelect: props.handleModelSelect,
    onThemeSelect: props.handleThemeSelect,
    onPermissionResponse: props.handlePermissionResponse ?? (() => {}),
    onPlanApprovalResponse: props.handlePlanApprovalResponse ?? (() => {}),
    onLearningResponse: props.handleLearningResponse ?? (() => {}),
    plan: props.plan,
  });

  props.handleExit();
};
