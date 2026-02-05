/**
 * Task Agent Tool
 *
 * Allows spawning specialized sub-agents for complex tasks.
 * Implements the agent delegation pattern from claude-code and opencode.
 * Supports parallel execution of up to 3 agents simultaneously.
 */

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";
import { MULTI_AGENT_DEFAULTS } from "@/constants/multi-agent";

/**
 * Agent types available for delegation
 */
const AGENT_TYPES = {
  explore: {
    description: "Fast codebase exploration (read-only)",
    tools: ["glob", "grep", "read"],
    tier: "fast",
    maxTurns: 10,
  },
  implement: {
    description: "Code writing and modification",
    tools: ["glob", "grep", "read", "write", "edit", "bash"],
    tier: "balanced",
    maxTurns: 20,
  },
  test: {
    description: "Test creation and execution",
    tools: ["glob", "grep", "read", "write", "edit", "bash"],
    tier: "balanced",
    maxTurns: 15,
  },
  review: {
    description: "Code review and suggestions",
    tools: ["glob", "grep", "read"],
    tier: "balanced",
    maxTurns: 10,
  },
  refactor: {
    description: "Code refactoring and improvement",
    tools: ["glob", "grep", "read", "write", "edit"],
    tier: "thorough",
    maxTurns: 25,
  },
  plan: {
    description: "Planning and architecture design",
    tools: ["glob", "grep", "read", "plan_approval"],
    tier: "thorough",
    maxTurns: 15,
  },
} as const;

type AgentType = keyof typeof AGENT_TYPES;

/**
 * Parameters for the task agent tool
 */
const taskAgentSchema = z.object({
  agent_type: z
    .enum(["explore", "implement", "test", "review", "refactor", "plan"])
    .describe("The type of specialized agent to spawn"),

  task: z
    .string()
    .describe("The task for the agent to perform"),

  context_files: z
    .array(z.string())
    .optional()
    .describe("Files to include as context for the agent"),

  run_in_background: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to run the agent in the background"),

  max_turns: z
    .number()
    .optional()
    .describe("Maximum number of turns for the agent"),
});

type TaskAgentParams = z.infer<typeof taskAgentSchema>;

/**
 * Active background agents with their results
 */
interface BackgroundAgent {
  id: string;
  type: AgentType;
  task: string;
  startTime: number;
  promise: Promise<ToolResult>;
  result?: ToolResult;
}

const backgroundAgents = new Map<string, BackgroundAgent>();

/**
 * Currently running foreground agents (for parallel execution limit)
 */
let runningForegroundAgents = 0;
const MAX_CONCURRENT_AGENTS = MULTI_AGENT_DEFAULTS.maxConcurrent; // 3

/**
 * Queue for agents waiting to run
 */
interface QueuedAgent {
  params: TaskAgentParams;
  systemPrompt: string;
  taskPrompt: string;
  ctx: ToolContext;
  resolve: (result: ToolResult) => void;
  reject: (error: Error) => void;
}

const agentQueue: QueuedAgent[] = [];

/**
 * Process the agent queue
 */
const processQueue = async (): Promise<void> => {
  while (agentQueue.length > 0 && runningForegroundAgents < MAX_CONCURRENT_AGENTS) {
    const queued = agentQueue.shift();
    if (!queued) break;

    runningForegroundAgents++;

    executeAgentInternal(queued.params, queued.systemPrompt, queued.taskPrompt, queued.ctx)
      .then(queued.resolve)
      .catch(queued.reject)
      .finally(() => {
        runningForegroundAgents--;
        processQueue();
      });
  }
};

/**
 * Execute the task agent tool
 */
export const executeTaskAgent = async (
  params: TaskAgentParams,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const agentConfig = AGENT_TYPES[params.agent_type];

  // Build the agent system prompt
  const systemPrompt = buildAgentSystemPrompt(params.agent_type, agentConfig);

  // Build the task prompt
  const taskPrompt = buildTaskPrompt(params);

  if (params.run_in_background) {
    return runAgentInBackground(params, systemPrompt, taskPrompt, ctx);
  }

  return runAgentInForeground(params, systemPrompt, taskPrompt, ctx);
};

/**
 * Build system prompt for the agent
 */
const buildAgentSystemPrompt = (
  agentType: AgentType,
  config: typeof AGENT_TYPES[AgentType],
): string => {
  const prompts: Record<AgentType, string> = {
    explore: `You are an EXPLORATION agent. Your task is to quickly understand code.

## Rules
- USE ONLY: glob, grep, read
- DO NOT modify any files
- Focus on finding and understanding relevant code
- Report findings concisely

## Output Format
Provide structured findings:
- Key files found
- Important patterns
- Relevant code locations (file:line)`,

    implement: `You are an IMPLEMENTATION agent. Your task is to write code.

## Rules
- Read existing code before modifying
- Follow existing patterns and conventions
- Make minimal, focused changes
- Verify changes with type checks or tests

## Output Format
- Summarize changes made
- List files modified
- Report any issues encountered`,

    test: `You are a TESTING agent. Your task is to write and run tests.

## Rules
- Write deterministic tests
- Mock external dependencies
- Cover edge cases
- Run tests after writing

## Output Format
- Tests created
- Test results
- Coverage notes`,

    review: `You are a REVIEW agent. Your task is to review code quality.

## Rules
- Check for bugs and issues
- Evaluate code quality
- Suggest improvements
- Be constructive

## Output Format
- Issues found (severity, location, description)
- Suggestions for improvement
- Overall assessment`,

    refactor: `You are a REFACTORING agent. Your task is to improve code structure.

## Rules
- Preserve existing behavior
- Improve readability and maintainability
- Follow SOLID principles
- Verify with tests after changes

## Output Format
- Changes made
- Improvements achieved
- Verification results`,

    plan: `You are a PLANNING agent. Your task is to design implementation plans.

## Rules
- Explore thoroughly before planning
- Consider edge cases and risks
- Break down into manageable steps
- Use plan_approval tool to submit plans

## Output Format
- Context analysis
- Implementation steps
- Risks and mitigations
- Testing strategy`,
  };

  return `${prompts[agentType]}

## Available Tools
${config.tools.join(", ")}

## Tier
${config.tier} (max ${config.maxTurns} turns)`;
};

/**
 * Build task prompt with context
 */
const buildTaskPrompt = (params: TaskAgentParams): string => {
  const parts = [`## Task\n${params.task}`];

  if (params.context_files?.length) {
    parts.push(`\n## Context Files\n${params.context_files.map(f => `- ${f}`).join("\n")}`);
  }

  return parts.join("\n");
};

/**
 * Run agent in foreground with concurrency control
 */
const runAgentInForeground = async (
  params: TaskAgentParams,
  systemPrompt: string,
  taskPrompt: string,
  ctx: ToolContext,
): Promise<ToolResult> => {
  // Check if we can run immediately
  if (runningForegroundAgents < MAX_CONCURRENT_AGENTS) {
    runningForegroundAgents++;

    try {
      return await executeAgentInternal(params, systemPrompt, taskPrompt, ctx);
    } finally {
      runningForegroundAgents--;
      processQueue();
    }
  }

  // Queue the agent if at capacity
  return new Promise((resolve, reject) => {
    agentQueue.push({
      params,
      systemPrompt,
      taskPrompt,
      ctx,
      resolve,
      reject,
    });
  });
};

/**
 * Execute agent internal logic
 */
const executeAgentInternal = async (
  params: TaskAgentParams,
  systemPrompt: string,
  taskPrompt: string,
  _ctx: ToolContext,
): Promise<ToolResult> => {
  const startTime = Date.now();

  try {
    // Dynamic import to avoid circular dependencies
    const { runAgent } = await import("@services/core/agent");

    const agentConfig = AGENT_TYPES[params.agent_type];

    // Get appropriate model for tier
    const tierModels: Record<string, string> = {
      fast: "gpt-4o-mini",
      balanced: "gpt-4o",
      thorough: "gpt-4o",
    };

    const model = tierModels[agentConfig.tier] ?? "gpt-4o";

    const result = await runAgent(taskPrompt, systemPrompt, {
      provider: "copilot",
      model,
      autoApprove: true,
      maxIterations: params.max_turns ?? agentConfig.maxTurns,
    });

    const duration = Date.now() - startTime;

    return {
      success: result.success,
      title: `${params.agent_type} agent completed`,
      output: `## Agent Result (${params.agent_type})\n\nDuration: ${(duration / 1000).toFixed(1)}s\nIterations: ${result.iterations}\nTool calls: ${result.toolCalls.length}\n\n${result.finalResponse}`,
      metadata: {
        agentType: params.agent_type,
        duration,
        iterations: result.iterations,
        toolCalls: result.toolCalls.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      title: `${params.agent_type} agent failed`,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Run agent in background (non-blocking)
 */
const runAgentInBackground = async (
  params: TaskAgentParams,
  systemPrompt: string,
  taskPrompt: string,
  ctx: ToolContext,
): Promise<ToolResult> => {
  const agentId = uuidv4();

  const promise = runAgentInForeground(params, systemPrompt, taskPrompt, ctx);

  const agent: BackgroundAgent = {
    id: agentId,
    type: params.agent_type,
    task: params.task,
    startTime: Date.now(),
    promise,
  };

  backgroundAgents.set(agentId, agent);

  // Store result and cleanup after completion
  promise.then((result) => {
    agent.result = result;
    // Keep result for 5 minutes
    setTimeout(() => backgroundAgents.delete(agentId), 5 * 60 * 1000);
  });

  return {
    success: true,
    title: `${params.agent_type} agent started in background`,
    output: `Agent ID: ${agentId}\n\nThe ${params.agent_type} agent is now running in the background.\nUse the agent ID to check status or retrieve results.\n\nCurrent running agents: ${runningForegroundAgents}/${MAX_CONCURRENT_AGENTS}`,
    metadata: {
      agentId,
      agentType: params.agent_type,
      runningInBackground: true,
    },
  };
};

/**
 * Get background agent status
 */
export const getBackgroundAgentStatus = async (
  agentId: string,
): Promise<ToolResult> => {
  const agent = backgroundAgents.get(agentId);

  if (!agent) {
    return {
      success: false,
      title: "Agent not found",
      output: "",
      error: `No background agent found with ID: ${agentId}`,
    };
  }

  // Return cached result if available
  if (agent.result) {
    return agent.result;
  }

  // Check if completed (with short timeout)
  const result = await Promise.race([
    agent.promise.then(r => ({ completed: true as const, result: r })),
    new Promise<{ completed: false }>((resolve) =>
      setTimeout(() => resolve({ completed: false }), 100),
    ),
  ]);

  if (result.completed) {
    return result.result;
  }

  const runningTime = Date.now() - agent.startTime;

  return {
    success: true,
    title: "Agent still running",
    output: `Agent ${agent.type} is still running.\nTask: ${agent.task}\nRunning for: ${(runningTime / 1000).toFixed(1)}s`,
    metadata: {
      agentId,
      agentType: agent.type,
      runningTime,
      status: "running",
    },
  };
};

/**
 * Get current agent execution status
 */
export const getAgentExecutionStatus = (): {
  running: number;
  queued: number;
  background: number;
  maxConcurrent: number;
} => ({
  running: runningForegroundAgents,
  queued: agentQueue.length,
  background: backgroundAgents.size,
  maxConcurrent: MAX_CONCURRENT_AGENTS,
});

/**
 * Tool definition for task agent
 */
export const taskAgentTool: ToolDefinition<typeof taskAgentSchema> = {
  name: "task_agent",
  description: `Spawn a specialized sub-agent for complex tasks.

Available agent types:
- explore: Fast codebase exploration (read-only)
- implement: Code writing and modification
- test: Test creation and execution
- review: Code review and suggestions
- refactor: Code refactoring and improvement
- plan: Planning and architecture design

PARALLEL EXECUTION:
- Up to ${MAX_CONCURRENT_AGENTS} agents can run simultaneously
- Launch multiple agents in a single message for parallel execution
- Agents exceeding the limit will queue automatically

Use agents when:
- Task requires specialized focus
- Multiple parallel investigations needed
- Complex implementation that benefits from isolation

Example: To explore 3 areas of the codebase in parallel, call task_agent 3 times in the same message.`,
  parameters: taskAgentSchema,
  execute: executeTaskAgent,
};
