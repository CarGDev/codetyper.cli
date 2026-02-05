/**
 * Google Provider-Specific Prompt Enhancements
 *
 * Models: Gemini Flash, Pro, Ultra
 *
 * Gemini models work best with:
 * - Multi-modal understanding
 * - Grounded responses
 * - Long context handling
 * - Code execution capabilities
 */

export const GOOGLE_TOOL_PATTERNS = `## Gemini Tool Usage Patterns

### Function Calling
Gemini supports structured function calling:
- Define tools with clear schemas
- Use grounding for factual responses
- Leverage code execution when available

### Multi-Modal Capabilities
Gemini can process:
- Code files and syntax
- Documentation and diagrams (if provided)
- Error messages and logs

### Grounding
For factual queries:
- Use Google Search grounding when available
- Cite sources when making claims
- Distinguish between knowledge and inference`;

export const GOOGLE_CONTEXT_PATTERNS = `## Gemini Context Handling

### Long Context (1M+ tokens)
Gemini Pro supports very long contexts:
- Can process entire repositories
- Maintains coherence across many files
- Use for comprehensive codebase analysis

### Context Structure
Organize context effectively:
\`\`\`
## Project Structure
[directory tree]

## Key Files
### src/main.ts
[contents]

### src/config.ts
[contents]
\`\`\`

### Memory Efficiency
Despite large context:
- Summarize when possible
- Focus on relevant sections
- Use file excerpts for large files`;

export const GOOGLE_BEST_PRACTICES = `## Gemini Best Practices

### Prompt Structure
Gemini responds well to:
1. Clear, direct instructions
2. Structured markdown
3. Examples with expected output
4. Step-by-step guidance

### Thinking Style
Gemini tends to:
- Be direct and action-oriented
- Provide complete solutions
- Follow instructions literally

### Response Quality

**Flash**: Speed-optimized
- Quick responses
- Good for simple tasks
- May miss nuances
- Verify complex logic

**Pro**: Balanced reasoning
- Strong code understanding
- Good multi-step execution
- Reliable for most tasks
- Can handle refactoring

**Ultra**: Maximum capability
- Deep reasoning
- Complex problem solving
- Architectural decisions
- Multi-agent coordination

### Code Generation Style
Gemini generates code that:
- Follows modern patterns
- May be verbose - trim as needed
- Includes type annotations
- Often adds extra features - focus on requirements`;

export const GOOGLE_SPECIFIC_NOTES = `## Gemini-Specific Notes

### Temperature Guidance
- 0.0-0.2: Deterministic code generation
- 0.3-0.5: Balanced creativity
- 0.7+: Exploratory solutions

### Safety Settings
Gemini has safety filters:
- Code that handles sensitive data may need context
- Security-related code needs clear defensive framing
- Explain the legitimate use case upfront

### Rate Limits
Be aware of:
- Requests per minute limits
- Token limits per request
- Consider batching for large operations`;

/**
 * Build Google-specific enhancements
 */
export const buildGoogleEnhancements = (): string => {
  return [
    GOOGLE_TOOL_PATTERNS,
    GOOGLE_CONTEXT_PATTERNS,
    GOOGLE_BEST_PRACTICES,
    GOOGLE_SPECIFIC_NOTES,
  ].join("\n\n");
};

/**
 * Check if model is from Google
 */
export const isGoogleModel = (modelId: string): boolean => {
  const lowerModel = modelId.toLowerCase();
  return (
    lowerModel.includes("gemini") ||
    lowerModel.includes("google") ||
    lowerModel.includes("palm") ||
    lowerModel.includes("bard")
  );
};

/**
 * Get Google-specific parameters
 */
export const getGoogleParams = (modelId: string): {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
} => {
  const lowerModel = modelId.toLowerCase();

  // Ultra - maximum capability
  if (lowerModel.includes("ultra")) {
    return {
      temperature: 0.3,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
    };
  }

  // Pro - balanced
  if (lowerModel.includes("pro")) {
    return {
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
    };
  }

  // Flash - fast
  if (lowerModel.includes("flash")) {
    return {
      temperature: 0.1,
      topP: 0.9,
      topK: 32,
      maxOutputTokens: 2048,
    };
  }

  // Default
  return {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4096,
  };
};
