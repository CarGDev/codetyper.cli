/**
 * Ollama Provider-Specific Prompt Enhancements
 *
 * Models: Llama, Mistral, CodeLlama, Qwen, DeepSeek, Phi
 *
 * Local models work best with:
 * - Explicit, structured prompts
 * - Simpler instructions
 * - Clear task boundaries
 * - Fallback handling
 */

export const OLLAMA_TOOL_PATTERNS = `## Ollama Tool Usage Patterns

### Tool Calling
Local models have varying tool support:
- Some models support function calling natively
- Others need tool calls formatted in the prompt
- Verify tool support for your specific model

### Structured Output
For models without native tool support:
\`\`\`
To use a tool, output in this format:
<tool_call>
{"name": "read", "arguments": {"file_path": "src/main.ts"}}
</tool_call>
\`\`\`

### Response Parsing
Expect varied output formats:
- Parse tool calls flexibly
- Handle partial JSON
- Retry on malformed responses`;

export const OLLAMA_CONTEXT_PATTERNS = `## Ollama Context Handling

### Limited Context Windows
Most local models have smaller contexts:
- Llama 3.1: 128K tokens
- Mistral: 32K tokens
- Smaller models: 4K-8K tokens

### Context Optimization
Prioritize information:
1. Current task requirements
2. Directly relevant code
3. Minimal supporting context

### Chunking Strategy
For large files:
- Read in sections
- Summarize before proceeding
- Focus on relevant functions`;

export const OLLAMA_BEST_PRACTICES = `## Ollama Best Practices

### Prompt Structure
Local models need clearer instructions:
1. State the task explicitly
2. Provide examples
3. Define expected output format
4. Set clear boundaries

### Thinking Style
Guide reasoning explicitly:
\`\`\`
Before responding:
1. Read the file
2. Identify the issue
3. Plan the fix
4. Make the change
5. Verify

Now proceed step by step.
\`\`\`

### Response Quality

**CodeLlama**: Code-focused
- Strong at code completion
- Good syntax understanding
- May struggle with context

**Llama 3.x**: General purpose
- Balanced capabilities
- Good instruction following
- Reliable for most tasks

**Mistral**: Efficient
- Fast responses
- Good code generation
- Smaller context window

**Qwen/DeepSeek**: Advanced
- Strong reasoning
- Good code understanding
- May have quirks with tool calling

**Phi**: Compact
- Very fast
- Good for simple tasks
- Limited complex reasoning`;

export const OLLAMA_SPECIFIC_NOTES = `## Ollama-Specific Notes

### Performance Optimization
Local model considerations:
- GPU memory limits batch size
- Longer prompts = slower responses
- Consider streaming for better UX

### Temperature Guidance
- 0.0-0.1: Most deterministic
- 0.2-0.4: Balanced (recommended for code)
- 0.5+: More variation

### Common Issues

**Repetition**: If model repeats itself
- Lower temperature
- Add "Do not repeat yourself" instruction
- Use repeat_penalty parameter

**Tool Call Failures**: If tools aren't called correctly
- Provide more examples
- Use simpler tool schemas
- Parse output more flexibly

**Context Overflow**: If responses degrade
- Reduce context size
- Summarize earlier conversation
- Focus on current task only

### Model-Specific Quirks

| Model | Quirk | Mitigation |
|-------|-------|------------|
| Llama | Verbose | Ask for brevity |
| Mistral | Fast but shallow | Break into steps |
| CodeLlama | Code-only | Provide context |
| Qwen | Chinese output | English-only instruction |
| DeepSeek | Extended thinking | Be patient |`;

export const OLLAMA_FALLBACK = `## Fallback Behavior

When local model struggles:

1. **Simplify the task**
   - Break into smaller steps
   - Reduce context
   - Be more explicit

2. **Retry with guidance**
   - Provide an example
   - Show expected format
   - Give starting point

3. **Escalate if needed**
   - Complex tasks may need cloud models
   - Suggest switching providers
   - Save progress for continuation`;

/**
 * Build Ollama-specific enhancements
 */
export const buildOllamaEnhancements = (): string => {
  return [
    OLLAMA_TOOL_PATTERNS,
    OLLAMA_CONTEXT_PATTERNS,
    OLLAMA_BEST_PRACTICES,
    OLLAMA_SPECIFIC_NOTES,
    OLLAMA_FALLBACK,
  ].join("\n\n");
};

/**
 * Check if model is a local Ollama model
 */
export const isOllamaModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();
  return (
    lowerModel.includes("llama") ||
    lowerModel.includes("mistral") ||
    lowerModel.includes("codellama") ||
    lowerModel.includes("qwen") ||
    lowerModel.includes("deepseek") ||
    lowerModel.includes("phi") ||
    lowerModel.includes("mixtral") ||
    lowerModel.includes("vicuna") ||
    lowerModel.includes("orca") ||
    lowerModel.includes("neural") ||
    lowerModel.includes("starcoder") ||
    lowerModel.includes("wizardcoder")
  );
};

/**
 * Get Ollama-specific parameters
 */
export const getOllamaParams = (modelId: string): {
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  numPredict: number;
} => {
  const lowerModel = modelId.toLowerCase();

  // Code-focused models
  if (lowerModel.includes("code") || lowerModel.includes("starcoder") || lowerModel.includes("wizard")) {
    return {
      temperature: 0.1,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      numPredict: 2048,
    };
  }

  // Large models (70B+)
  if (lowerModel.includes("70b") || lowerModel.includes("72b") || lowerModel.includes("405b")) {
    return {
      temperature: 0.2,
      topP: 0.95,
      topK: 50,
      repeatPenalty: 1.05,
      numPredict: 4096,
    };
  }

  // Small models (7B and under)
  if (lowerModel.includes("7b") || lowerModel.includes("3b") || lowerModel.includes("mini")) {
    return {
      temperature: 0.1,
      topP: 0.85,
      topK: 30,
      repeatPenalty: 1.15,
      numPredict: 1024,
    };
  }

  // Default
  return {
    temperature: 0.2,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    numPredict: 2048,
  };
};
