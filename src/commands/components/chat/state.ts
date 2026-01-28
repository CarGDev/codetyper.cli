import type { Provider as ProviderName } from "@/types/index";
import type { Message } from "@providers/index";
import type { InputEditorInstance } from "@ui/index";
import { DEFAULT_SYSTEM_PROMPT } from "@prompts/index";

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
