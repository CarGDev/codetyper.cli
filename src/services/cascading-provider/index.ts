/**
 * Cascading Provider Service
 *
 * Orchestrates multi-provider cascading with quality learning
 */

export {
  checkOllamaAvailability,
  checkCopilotAvailability,
  getProviderStatuses,
  clearProviderCache,
  invalidateProvider,
  type ProviderStatus,
} from "./availability";

export {
  executeCascade,
  recordUserFeedback,
  type CascadeCallbacks,
  type CascadeOptions,
  type ProviderCallFn,
} from "./orchestrator";
