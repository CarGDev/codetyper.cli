/**
 * Anthropic Provider-Specific Prompt Enhancements
 *
 * Models: Claude Haiku, Sonnet, Opus
 *
 * Claude models work best with:
 * - XML-style structured blocks
 * - Explicit thinking blocks
 * - Artifact generation
 * - Extended context windows
 */

export const ANTHROPIC_TOOL_PATTERNS = `## Claude Tool Usage Patterns

### Structured Blocks
Claude responds well to XML-style structure:
\`\`\`
<thinking>
Analyzing the request...
</thinking>

<plan>
1. First step
2. Second step
</plan>

<execute>
[tool calls here]
</execute>
\`\`\`

### Tool Use
- Claude can call multiple tools in sequence
- Each tool result is processed before continuing
- Use <result> blocks to summarize tool outputs

### Extended Thinking (Opus)
For Claude Opus, extended thinking is available:
\`\`\`
<extended_thinking>
Deep analysis of the problem space...
Considering multiple approaches...
Evaluating trade-offs...
</extended_thinking>
\`\`\``;

export const ANTHROPIC_CONTEXT_PATTERNS = `## Claude Context Handling

### Large Context Windows
Claude has 200K token context:
- Can read entire codebases
- Maintains consistency across long conversations
- Use for complex multi-file understanding

### Context Organization
Structure context clearly:
\`\`\`
<context>
  <file path="src/main.ts">
    [file contents]
  </file>
  <file path="src/utils.ts">
    [file contents]
  </file>
</context>
\`\`\`

### Memory Across Turns
Claude maintains conversation context:
- Reference previous findings by turn number
- Build on earlier analysis
- Avoid re-reading files unnecessarily`;

export const ANTHROPIC_BEST_PRACTICES = `## Claude Best Practices

### Prompt Structure
Claude responds well to:
1. Clear role definition
2. Explicit constraints
3. Structured output format
4. Examples with XML blocks

### Thinking Style
- Use <thinking> for reasoning
- Be thorough in analysis
- Consider edge cases
- Explain trade-offs

### Response Quality
Claude tends to:
- Be more verbose - ask for conciseness
- Over-explain - request brevity
- Be cautious - encourage action

### Model-Specific Notes

**Haiku**: Fast but limited reasoning
- Keep tasks simple
- Break down complex requests
- Verify outputs carefully

**Sonnet**: Balanced performance
- Good for most coding tasks
- Can handle multi-file changes
- Reliable tool usage

**Opus**: Advanced reasoning
- Complex architectural decisions
- Deep codebase analysis
- Multi-agent coordination`;

/**
 * Build Anthropic-specific enhancements
 */
export const buildAnthropicEnhancements = (): string => {
  return [
    ANTHROPIC_TOOL_PATTERNS,
    ANTHROPIC_CONTEXT_PATTERNS,
    ANTHROPIC_BEST_PRACTICES,
  ].join("\n\n");
};

/**
 * Check if model is from Anthropic
 */
export const isAnthropicModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();
  return (
    lowerModel.includes("claude") ||
    lowerModel.includes("anthropic") ||
    lowerModel.includes("haiku") ||
    lowerModel.includes("sonnet") ||
    lowerModel.includes("opus")
  );
};

/**
 * Get Anthropic-specific parameters
 */
export const getAnthropicParams = (modelId: string): {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
} => {
  const lowerModel = modelId.toLowerCase();

  // Opus - extended thinking
  if (lowerModel.includes("opus")) {
    return {
      temperature: 0.3,
      topP: 0.95,
      topK: 50,
      maxTokens: 8192,
    };
  }

  // Sonnet - balanced
  if (lowerModel.includes("sonnet")) {
    return {
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
      maxTokens: 4096,
    };
  }

  // Haiku - fast
  if (lowerModel.includes("haiku")) {
    return {
      temperature: 0.1,
      topP: 0.9,
      topK: 30,
      maxTokens: 2048,
    };
  }

  // Default
  return {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxTokens: 4096,
  };
};
