/**
 * Mode Types for System Prompts
 *
 * Defines the available modes and their tier compatibility.
 */

/**
 * Available prompt modes
 */
export type PromptMode =
  | "agent"      // Default autonomous mode
  | "ask"        // Read-only Q&A mode
  | "plan"       // Planning mode with approval
  | "code-review"// Code review mode
  | "debug"      // Debugging mode
  | "refactor"   // Refactoring mode
  | "implement"; // Implementation mode (after plan approval)

/**
 * Mode metadata for routing
 */
export interface ModeMetadata {
  name: PromptMode;
  readOnly: boolean;
  requiresApproval: boolean;
  preferredTier: "fast" | "balanced" | "thorough" | "any";
  description: string;
}

/**
 * Mode registry with metadata
 */
export const MODE_REGISTRY: Record<PromptMode, ModeMetadata> = {
  agent: {
    name: "agent",
    readOnly: false,
    requiresApproval: false,
    preferredTier: "any",
    description: "Autonomous coding agent with full tool access",
  },
  ask: {
    name: "ask",
    readOnly: true,
    requiresApproval: false,
    preferredTier: "fast",
    description: "Read-only mode for answering questions about code",
  },
  plan: {
    name: "plan",
    readOnly: true,
    requiresApproval: true,
    preferredTier: "balanced",
    description: "Planning mode for designing implementation approaches",
  },
  "code-review": {
    name: "code-review",
    readOnly: true,
    requiresApproval: false,
    preferredTier: "balanced",
    description: "Thorough code review with structured feedback",
  },
  debug: {
    name: "debug",
    readOnly: false,
    requiresApproval: false,
    preferredTier: "balanced",
    description: "Systematic debugging with root cause analysis",
  },
  refactor: {
    name: "refactor",
    readOnly: false,
    requiresApproval: false,
    preferredTier: "balanced",
    description: "Code refactoring preserving behavior",
  },
  implement: {
    name: "implement",
    readOnly: false,
    requiresApproval: false,
    preferredTier: "any",
    description: "Implementation mode after plan approval",
  },
};

/**
 * Check if a mode is read-only
 */
export const isReadOnlyMode = (mode: PromptMode): boolean => {
  return MODE_REGISTRY[mode].readOnly;
};

/**
 * Check if a mode requires user approval
 */
export const requiresApproval = (mode: PromptMode): boolean => {
  return MODE_REGISTRY[mode].requiresApproval;
};

/**
 * Get the preferred tier for a mode
 */
export const getPreferredTier = (mode: PromptMode): "fast" | "balanced" | "thorough" | "any" => {
  return MODE_REGISTRY[mode].preferredTier;
};
