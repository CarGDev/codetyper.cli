/**
 * Project Setup Service
 *
 * Automatically configures the project on startup:
 * - Adds .codetyper to .gitignore if .git exists
 * - Creates default agent configurations in .codetyper/agents/
 */

import fs from "fs/promises";
import path from "path";

const CODETYPER_DIR = ".codetyper";
const AGENTS_DIR = "agents";
const GITIGNORE_ENTRY = ".codetyper/";

interface SetupResult {
  gitignoreUpdated: boolean;
  agentsCreated: string[];
  errors: string[];
}

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const isGitRepository = async (workingDir: string): Promise<boolean> => {
  return fileExists(path.join(workingDir, ".git"));
};

const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch {
    // Directory might already exist
  }
};

const addToGitignore = async (workingDir: string): Promise<boolean> => {
  const gitignorePath = path.join(workingDir, ".gitignore");

  try {
    let content = "";
    const exists = await fileExists(gitignorePath);

    if (exists) {
      content = await fs.readFile(gitignorePath, "utf-8");

      // Check if already present
      const lines = content.split("\n").map((line) => line.trim());
      if (lines.includes(GITIGNORE_ENTRY) || lines.includes(CODETYPER_DIR)) {
        return false; // Already configured
      }
    }

    // Add .codetyper to gitignore
    const newContent = content.endsWith("\n") || content === ""
      ? `${content}${GITIGNORE_ENTRY}\n`
      : `${content}\n${GITIGNORE_ENTRY}\n`;

    await fs.writeFile(gitignorePath, newContent, "utf-8");
    return true;
  } catch {
    return false;
  }
};

interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  mode: "primary" | "subagent" | "all";
  color: string;
  prompt: string;
}

const DEFAULT_AGENTS: AgentDefinition[] = [
  {
    id: "explore",
    name: "Explore",
    description: "Fast codebase exploration specialist",
    mode: "subagent",
    color: "cyan",
    prompt: `You are an expert codebase explorer. Your role is to quickly navigate and understand codebases.

## Capabilities
- Find files by patterns and naming conventions
- Search code for keywords, functions, classes, and patterns
- Answer questions about codebase structure and architecture
- Identify key files and entry points

## Guidelines
- Use Glob to find files by pattern
- Use Grep to search file contents
- Use Read to examine specific files
- Be thorough but efficient - explore multiple locations
- Report findings with exact file paths and line numbers
- Summarize patterns and conventions you discover

## Output Format
Always include:
1. Files found (with paths)
2. Relevant code snippets
3. Summary of findings
4. Suggestions for further exploration if needed`,
  },
  {
    id: "plan",
    name: "Plan",
    description: "Software architect for designing implementation plans",
    mode: "subagent",
    color: "yellow",
    prompt: `You are a software architect specializing in implementation planning.

## Role
Design comprehensive implementation plans for features, refactors, and bug fixes.

## Approach
1. Analyze requirements thoroughly
2. Explore relevant codebase areas
3. Identify affected components
4. Consider architectural trade-offs
5. Create step-by-step implementation plans

## Output Format
Your plans should include:

### Summary
Brief overview of the change

### Affected Files
List of files that will be created, modified, or deleted

### Implementation Steps
1. Step-by-step instructions
2. Each step should be atomic and testable
3. Include code snippets where helpful

### Considerations
- Potential risks or edge cases
- Testing requirements
- Performance implications
- Backwards compatibility

### Dependencies
Any prerequisites or blocking tasks`,
  },
  {
    id: "bash",
    name: "Bash",
    description: "Command execution specialist for terminal operations",
    mode: "subagent",
    color: "green",
    prompt: `You are a command execution specialist for terminal operations.

## Expertise
- Git operations (commit, push, branch, rebase, etc.)
- Package management (npm, yarn, pnpm, pip, etc.)
- Build tools and scripts
- System commands
- Docker and container operations

## Guidelines
- Always explain what commands will do before executing
- Use safe defaults and avoid destructive operations
- Quote paths with spaces properly
- Handle errors gracefully
- Provide clear output and status

## Safety Rules
- NEVER run destructive commands without explicit confirmation
- NEVER modify git config without permission
- NEVER force push to main/master
- NEVER skip safety hooks unless requested
- Always check command exit codes

## Output
Include:
- Command being executed
- Expected outcome
- Actual output or error
- Next steps if needed`,
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    description: "Expert code reviewer for quality and best practices",
    mode: "subagent",
    color: "magenta",
    prompt: `You are an expert code reviewer focused on quality and best practices.

## Review Areas
1. **Correctness** - Does the code do what it's supposed to?
2. **Security** - Are there vulnerabilities or unsafe patterns?
3. **Performance** - Are there inefficiencies or bottlenecks?
4. **Maintainability** - Is the code readable and well-organized?
5. **Testing** - Is the code testable and properly tested?

## Review Process
1. Understand the change's purpose
2. Check for correctness and edge cases
3. Look for security issues (OWASP top 10)
4. Assess code style and conventions
5. Verify error handling
6. Check test coverage

## Output Format
### Summary
Brief assessment of the change

### Issues Found
- **Critical**: Must fix before merge
- **Major**: Should fix, significant impact
- **Minor**: Nice to fix, low impact
- **Nitpick**: Style/preference suggestions

### Positive Aspects
What's done well

### Suggestions
Specific improvements with code examples`,
  },
  {
    id: "architect",
    name: "Code Architect",
    description: "Design implementation plans and architectural decisions",
    mode: "subagent",
    color: "blue",
    prompt: `You are a code architect specializing in system design and implementation strategy.

## Responsibilities
- Design scalable and maintainable solutions
- Make architectural decisions with clear trade-offs
- Create implementation roadmaps
- Identify patterns and anti-patterns

## Approach
1. **Understand Context**
   - Current system architecture
   - Constraints and requirements
   - Team capabilities and preferences

2. **Explore Options**
   - Consider multiple approaches
   - Evaluate trade-offs
   - Document pros and cons

3. **Design Solution**
   - Clear component structure
   - Interface definitions
   - Data flow diagrams
   - Integration points

4. **Plan Implementation**
   - Phased approach if needed
   - Risk mitigation
   - Testing strategy

## Output
- Architecture overview
- Component breakdown
- Interface contracts
- Implementation phases
- Risk assessment`,
  },
  {
    id: "general",
    name: "General Purpose",
    description: "Multi-step research and complex task execution",
    mode: "subagent",
    color: "white",
    prompt: `You are a general-purpose agent for researching complex questions and executing multi-step tasks.

## Capabilities
- Search codebases for information
- Read and analyze files
- Execute multi-step research tasks
- Synthesize findings from multiple sources
- Answer complex questions about code

## Approach
1. Break down complex tasks into steps
2. Gather information systematically
3. Cross-reference findings
4. Synthesize and summarize

## Guidelines
- Be thorough in research
- Cite sources with file paths and line numbers
- Acknowledge uncertainty when present
- Provide actionable insights

## Output
- Clear, structured answers
- Supporting evidence
- Confidence level
- Further research suggestions if needed`,
  },
];

const generateAgentFile = (agent: AgentDefinition): string => {
  return `---
name: "${agent.name}"
description: "${agent.description}"
mode: "${agent.mode}"
color: "${agent.color}"
---

${agent.prompt}
`;
};

const createDefaultAgents = async (workingDir: string): Promise<string[]> => {
  const agentsDir = path.join(workingDir, CODETYPER_DIR, AGENTS_DIR);
  const created: string[] = [];

  await ensureDirectoryExists(agentsDir);

  for (const agent of DEFAULT_AGENTS) {
    const filePath = path.join(agentsDir, `${agent.id}.agent.md`);

    // Skip if already exists
    if (await fileExists(filePath)) {
      continue;
    }

    try {
      const content = generateAgentFile(agent);
      await fs.writeFile(filePath, content, "utf-8");
      created.push(agent.id);
    } catch {
      // Skip on error
    }
  }

  return created;
};

export const setupProject = async (workingDir: string): Promise<SetupResult> => {
  const result: SetupResult = {
    gitignoreUpdated: false,
    agentsCreated: [],
    errors: [],
  };

  try {
    // Check if this is a git repository
    const isGit = await isGitRepository(workingDir);

    if (isGit) {
      // Add .codetyper to gitignore
      result.gitignoreUpdated = await addToGitignore(workingDir);
    }

    // Create default agents
    result.agentsCreated = await createDefaultAgents(workingDir);
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
};

export const getSetupStatus = async (workingDir: string): Promise<{
  hasGit: boolean;
  hasCodetyperDir: boolean;
  agentCount: number;
}> => {
  const hasGit = await isGitRepository(workingDir);
  const hasCodetyperDir = await fileExists(path.join(workingDir, CODETYPER_DIR));

  let agentCount = 0;
  if (hasCodetyperDir) {
    const agentsDir = path.join(workingDir, CODETYPER_DIR, AGENTS_DIR);
    if (await fileExists(agentsDir)) {
      const files = await fs.readdir(agentsDir);
      agentCount = files.filter((f) => f.endsWith(".agent.md")).length;
    }
  }

  return { hasGit, hasCodetyperDir, agentCount };
};

export const projectSetupService = {
  setupProject,
  getSetupStatus,
  isGitRepository,
};
