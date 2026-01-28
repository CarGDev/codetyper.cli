import type { ProviderName } from "@/types/providers";

export interface ChatOptions {
  provider?: ProviderName;
  model?: string;
  files?: string[];
  initialPrompt?: string;
  continueSession?: boolean;
  resumeSession?: string;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  printMode?: boolean;
  verbose?: boolean;
  autoApprove?: boolean;
}
