/**
 * GitHub Copilot Provider-Specific Prompt Enhancements
 *
 * Copilot provides access to multiple model families through a unified interface.
 * This file handles Copilot-specific patterns and model cost optimization.
 */

/**
 * Copilot model cost tiers
 */
export const COPILOT_MODEL_TIERS = {
  // Unlimited (0x) - no rate limiting
  unlimited: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-5-mini",
    "grok-code-fast-1",
    "raptor-mini",
  ],

  // Low cost (0.33x)
  lowCost: [
    "claude-haiku-4.5",
    "gemini-3-flash-preview",
    "gpt-5.1-codex-mini-preview",
  ],

  // Standard (1.0x)
  standard: [
    "claude-sonnet-4",
    "claude-sonnet-4.5",
    "gemini-2.5-pro",
    "gemini-3-pro-preview",
    "gpt-4.1",
    "gpt-5",
    "gpt-5-codex-preview",
    "gpt-5.1",
    "gpt-5.1-codex",
    "gpt-5.1-codex-max",
    "gpt-5.2",
    "gpt-5.2-codex",
  ],

  // Premium (3.0x)
  premium: [
    "claude-opus-4.5",
  ],
} as const;

export const COPILOT_TOOL_PATTERNS = `## Copilot Tool Usage Patterns

### Model Selection
Copilot provides multiple models with different cost/capability trade-offs:
- **Unlimited**: gpt-4o, gpt-4o-mini, gpt-5-mini - no rate limits
- **Low cost**: claude-haiku-4.5, gemini-3-flash - efficient
- **Standard**: claude-sonnet, gemini-pro, gpt-5 - capable
- **Premium**: claude-opus - maximum capability

### Function Calling
All Copilot models support function calling:
- Structured tool calls
- Parallel tool execution
- JSON argument parsing

### Context Handling
Copilot manages context automatically:
- Current file context
- Workspace context
- Recent conversation history`;

export const COPILOT_BEST_PRACTICES = `## Copilot Best Practices

### Model Recommendations by Task

| Task Type | Recommended Model | Reason |
|-----------|------------------|--------|
| Simple edits | gpt-4o-mini | Fast, unlimited |
| Code generation | gpt-4o | Balanced, unlimited |
| Complex reasoning | claude-sonnet-4.5 | High quality |
| Architecture | claude-opus-4.5 | Best reasoning |

### Efficiency Tips
- Use unlimited models for iterative work
- Reserve premium models for complex decisions
- Batch simple changes to reduce API calls

### Code Style
Copilot models:
- Follow project conventions when visible
- Match existing code patterns
- Use TypeScript types from context`;

/**
 * Build Copilot-specific enhancements
 */
export const buildCopilotEnhancements = (): string => {
  return [
    COPILOT_TOOL_PATTERNS,
    COPILOT_BEST_PRACTICES,
  ].join("\n\n");
};

/**
 * Check if model is accessed through Copilot
 */
export const isCopilotModel = (modelId: string): boolean => {
  const allModels = [
    ...COPILOT_MODEL_TIERS.unlimited,
    ...COPILOT_MODEL_TIERS.lowCost,
    ...COPILOT_MODEL_TIERS.standard,
    ...COPILOT_MODEL_TIERS.premium,
  ];

  const lowerModel = modelId.toLowerCase();
  return allModels.some(m => lowerModel.includes(m.toLowerCase()));
};

/**
 * Get cost tier for a Copilot model
 */
export const getCopilotCostTier = (modelId: string): "unlimited" | "lowCost" | "standard" | "premium" | "unknown" => {
  const lowerModel = modelId.toLowerCase();

  if (COPILOT_MODEL_TIERS.unlimited.some(m => lowerModel.includes(m.toLowerCase()))) {
    return "unlimited";
  }
  if (COPILOT_MODEL_TIERS.lowCost.some(m => lowerModel.includes(m.toLowerCase()))) {
    return "lowCost";
  }
  if (COPILOT_MODEL_TIERS.standard.some(m => lowerModel.includes(m.toLowerCase()))) {
    return "standard";
  }
  if (COPILOT_MODEL_TIERS.premium.some(m => lowerModel.includes(m.toLowerCase()))) {
    return "premium";
  }

  return "unknown";
};

/**
 * Get Copilot-specific parameters
 */
export const getCopilotParams = (modelId: string): {
  temperature: number;
  topP: number;
  maxTokens: number;
} => {
  const costTier = getCopilotCostTier(modelId);
  const lowerModel = modelId.toLowerCase();

  // Premium models - allow more tokens, lower temperature for precision
  if (costTier === "premium" || lowerModel.includes("opus")) {
    return {
      temperature: 0.2,
      topP: 0.95,
      maxTokens: 8192,
    };
  }

  // Standard models - balanced settings
  if (costTier === "standard") {
    return {
      temperature: 0.3,
      topP: 0.95,
      maxTokens: 4096,
    };
  }

  // Unlimited/low-cost models - faster, more efficient
  return {
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 2048,
  };
};
