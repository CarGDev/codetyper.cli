/**
 * OpenAI Provider-Specific Prompt Enhancements
 *
 * Models: GPT-4, GPT-4o, GPT-4-mini, GPT-5, o1, o3
 *
 * OpenAI models work best with:
 * - Clear, structured instructions
 * - JSON-formatted tool calls
 * - System/user message separation
 * - Function calling patterns
 */

export const OPENAI_TOOL_PATTERNS = `## OpenAI Tool Usage Patterns

### Function Calling
When using tools, structure calls clearly:
- One tool call per action for clarity
- Use parallel_tool_calls when operations are independent
- Handle tool results before making decisions

### JSON Mode
For structured outputs, use JSON format:
\`\`\`json
{
  "action": "edit",
  "file": "src/utils.ts",
  "change": "Add validation function"
}
\`\`\`

### Reasoning Models (o1, o3)
For o1/o3 models:
- Extended thinking is built-in, don't use <thinking> blocks
- Focus on the final answer
- Complex reasoning happens internally
- Be direct in responses`;

export const OPENAI_COPILOT_PATTERNS = `## GitHub Copilot Integration

When accessed via GitHub Copilot:

### Context Awareness
- Copilot provides file context automatically
- Current file and cursor position are known
- Nearby files may be included

### Completion Style
- Match the coding style of surrounding code
- Use consistent naming conventions
- Follow the project's patterns

### Chat Mode
In Copilot Chat:
- Workspace context is available
- @workspace queries search the codebase
- @terminal context includes recent commands`;

export const OPENAI_BEST_PRACTICES = `## OpenAI Best Practices

### Prompt Structure
1. System message: Role and capabilities
2. User message: Current task
3. Assistant: Execution

### Token Efficiency
- Be concise in reasoning
- Use abbreviations in internal thinking
- Summarize large file contents

### Error Handling
OpenAI models may:
- Hallucinate function names - verify with grep first
- Assume file structure - use glob to confirm
- Generate outdated syntax - check project conventions

### Temperature Guidance
- Code generation: 0.0-0.3 (deterministic)
- Creative solutions: 0.5-0.7
- Exploration: 0.7-1.0`;

/**
 * Build OpenAI-specific enhancements
 */
export const buildOpenAIEnhancements = (): string => {
  return [
    OPENAI_TOOL_PATTERNS,
    OPENAI_COPILOT_PATTERNS,
    OPENAI_BEST_PRACTICES,
  ].join("\n\n");
};

/**
 * Check if model is from OpenAI
 */
export const isOpenAIModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();
  return (
    lowerModel.includes("gpt") ||
    lowerModel.includes("o1") ||
    lowerModel.includes("o3") ||
    lowerModel.includes("davinci") ||
    lowerModel.includes("turbo") ||
    lowerModel.startsWith("ft:gpt")
  );
};

/**
 * Get OpenAI-specific parameters
 */
export const getOpenAIParams = (modelId: string): {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
} => {
  const lowerModel = modelId.toLowerCase();

  // Reasoning models
  if (lowerModel.includes("o1") || lowerModel.includes("o3")) {
    return {
      temperature: 1, // o1/o3 ignore temperature
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    };
  }

  // Code generation
  if (lowerModel.includes("gpt-5") || lowerModel.includes("gpt-4")) {
    return {
      temperature: 0.2,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0,
    };
  }

  // Default
  return {
    temperature: 0.3,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  };
};
