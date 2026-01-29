/**
 * Stream callbacks with state tracking
 */

import type { StreamCallbacks } from "@/types/streaming";

export interface StreamCallbacksWithState {
  callbacks: StreamCallbacks;
  hasReceivedContent: () => boolean;
}
