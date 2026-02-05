import type { Provider as ProviderName } from "@/types/common";
import type { Message } from "@/types/providers";
import type { InputEditorInstance } from "@ui/input-editor/core/editor";
import { DEFAULT_SYSTEM_PROMPT } from "@prompts/system/default";

export interface ChatState {
  inputEditor: InputEditorInstance | null;
  isRunning: boolean;
  isProcessing: boolean;
  currentProvider: ProviderName;
  currentModel: string | undefined;
  currentAgent: string | undefined;
  messages: Message[];
  contextFiles: Map<string, string>;
  systemPrompt: string;
  verbose: boolean;
  autoApprove: boolean;
}

export const createInitialState = (
  provider: ProviderName = "copilot",
): ChatState => ({
  inputEditor: null,
  isRunning: false,
  isProcessing: false,
  currentProvider: provider,
  currentModel: undefined,
  currentAgent: "coder",
  messages: [],
  contextFiles: new Map(),
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  verbose: false,
  autoApprove: false,
});
