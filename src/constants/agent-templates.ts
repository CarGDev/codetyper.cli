/**
 * Agent and Skill Templates
 *
 * Templates for creating new agents and skills in .codetyper/ directories.
 */

/**
 * Valid agent colors with semantic meaning
 */
export const AGENT_COLORS = {
  blue: "Analysis, review, code inspection",
  cyan: "Analysis, review, code inspection",
  green: "Success, generation, creation",
  yellow: "Validation, caution, verification",
  red: "Security, critical issues",
  magenta: "Transformation, creative tasks",
  white: "Neutral, general purpose",
  gray: "Internal, utility",
} as const;

/**
 * Valid model options
 */
export const AGENT_MODELS = {
  inherit: "Uses parent model (recommended)",
  sonnet: "Claude Sonnet (balanced, default)",
  opus: "Claude Opus (most capable)",
  haiku: "Claude Haiku (fast, cheap)",
  "gpt-4o": "GPT-4o (OpenAI balanced)",
  "gpt-4o-mini": "GPT-4o Mini (OpenAI fast)",
} as const;

/**
 * Agent frontmatter template
 */
export const AGENT_FRONTMATTER_TEMPLATE = `---
name: {{name}}
description: {{description}}
model: {{model}}
color: {{color}}
tools: [{{tools}}]
---
`;

/**
 * Agent markdown template
 */
export const AGENT_MARKDOWN_TEMPLATE = `---
name: {{name}}
description: Use this agent when {{trigger_description}}. Examples: {{examples}}
model: {{model}}
color: {{color}}
{{#if tools}}
tools: [{{tools}}]
{{/if}}
---

# {{display_name}}

{{system_prompt}}

## Core Process

{{process_steps}}

## Output Format

{{output_format}}

## Rules

{{rules}}
`;

/**
 * Skill frontmatter template
 */
export const SKILL_FRONTMATTER_TEMPLATE = `---
name: {{name}}
description: {{description}}
version: 0.1.0
---
`;

/**
 * Skill markdown template
 */
export const SKILL_MARKDOWN_TEMPLATE = `---
name: {{name}}
description: This skill should be used when {{trigger_description}}.
version: 0.1.0
---

# {{display_name}}

## Overview

{{overview}}

## When to Use

{{when_to_use}}

## How to Use

{{how_to_use}}

## Examples

{{examples}}

## Best Practices

{{best_practices}}
`;

/**
 * Default tools by agent type
 */
export const DEFAULT_TOOLS_BY_TYPE = {
  explore: ["glob", "grep", "read"],
  review: ["glob", "grep", "read"],
  implement: ["glob", "grep", "read", "write", "edit", "bash"],
  test: ["glob", "grep", "read", "write", "edit", "bash"],
  refactor: ["glob", "grep", "read", "write", "edit"],
  plan: ["glob", "grep", "read"],
  security: ["glob", "grep", "read"],
  documentation: ["glob", "grep", "read", "write"],
  general: [
    "glob",
    "grep",
    "read",
    "write",
    "edit",
    "bash",
    "web_search",
    "web_fetch",
  ],
} as const;

/**
 * Agent creation prompt for LLM
 */
export const AGENT_CREATION_PROMPT = `You are an agent configuration generator. Create a high-quality agent definition based on the user's description.

## Output Format

Generate a complete agent markdown file with:

1. **Frontmatter** (YAML between ---):
   - name: lowercase, hyphens only, 3-50 chars (e.g., "code-reviewer", "api-docs-writer")
   - description: Must start with "Use this agent when..." and include 2-4 <example> blocks
   - model: inherit (recommended) | sonnet | opus | haiku | gpt-4o | gpt-4o-mini
   - color: blue | cyan | green | yellow | magenta | red (match semantic meaning)
   - tools: array of tool names (optional, omit for full access)

2. **System Prompt** (markdown body):
   - Clear role definition
   - Core process steps
   - Output format specification
   - Rules and constraints

## Example

\`\`\`markdown
---
name: code-reviewer
description: Use this agent when the user asks to "review code", "check for bugs", "find issues", or wants code quality feedback. <example>Context: User wants code reviewed\nuser: "Review this function for bugs"\nassistant: "I'll use the code-reviewer agent to analyze the code."\n</example>
model: inherit
color: red
tools: ["glob", "grep", "read"]
---

# Code Reviewer

You are a senior code reviewer who identifies bugs, logic errors, and quality issues.

## Core Process

1. Read the code thoroughly
2. Check for common bug patterns
3. Analyze logic flow
4. Review error handling
5. Check for security issues

## Output Format

- **Issues Found:** List with severity, location, description
- **Suggestions:** Improvement recommendations
- **Summary:** Overall assessment

## Rules

- Never modify files
- Focus on actionable feedback
- Prioritize by severity
\`\`\`

## User's Description

{{description}}

Generate the complete agent markdown file:`;

/**
 * Skill creation prompt for LLM
 */
export const SKILL_CREATION_PROMPT = `You are a skill documentation generator. Create educational skill documentation based on the user's description.

## Output Format

Generate a complete skill SKILL.md file with:

1. **Frontmatter** (YAML between ---):
   - name: Display name with spaces
   - description: Trigger phrases when this skill should be used
   - version: 0.1.0

2. **Content** (markdown body):
   - Overview section
   - When to Use section
   - How to Use section with examples
   - Best Practices section

## Example

\`\`\`markdown
---
name: Git Workflow
description: This skill should be used when the user asks about "git commands", "branching strategy", "commit messages", "pull requests", or needs guidance on git workflows and best practices.
version: 0.1.0
---

# Git Workflow

## Overview

This skill covers git best practices for development workflows.

## When to Use

- Setting up a new git repository
- Creating feature branches
- Writing commit messages
- Managing pull requests

## How to Use

### Creating a Feature Branch

\`\`\`bash
git checkout -b feature/my-feature
\`\`\`

### Commit Message Format

\`\`\`
type(scope): description

[optional body]

[optional footer]
\`\`\`

## Best Practices

1. Use descriptive branch names
2. Keep commits atomic
3. Write clear commit messages
4. Review before merging
\`\`\`

## User's Description

{{description}}

Generate the complete skill SKILL.md file:`;

/**
 * Directories for agents and skills
 */
export const CODETYPER_DIRS = {
  agents: ".codetyper/agents",
  skills: ".codetyper/skills",
  plugins: ".codetyper/plugins",
} as const;

/**
 * File patterns for discovery
 */
export const DISCOVERY_PATTERNS = {
  agents: "**/*.md",
  skills: "**/SKILL.md",
} as const;
