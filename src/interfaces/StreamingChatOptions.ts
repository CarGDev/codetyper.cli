/**
 * Streaming Chat Options
 */

import type { AgentOptions } from "@interfaces/AgentOptions";
import type { ModelSwitchInfo } from "@/types/streaming";

export interface StreamingChatOptions extends AgentOptions {
  onModelSwitch?: (info: ModelSwitchInfo) => void;
}
