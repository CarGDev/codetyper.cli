/**
 * Parallel Exploration Service
 *
 * Launches multiple exploration agents in parallel to quickly
 * understand a codebase before planning or implementing changes.
 */

import type { AgentResult } from "@interfaces/AgentResult";
import { runAgent } from "@services/core/agent";
import { buildSystemPromptWithInfo } from "@prompts/system/builder";
import type { PromptContext } from "@prompts/system/builder";
import type { ProviderName } from "@/types/providers";

/**
 * Exploration task definition
 */
export interface ExplorationTask {
  id: string;
  description: string;
  searchPatterns?: string[];
  filePatterns?: string[];
  keywords?: string[];
}

/**
 * Exploration result from a single agent
 */
export interface ExplorationResult {
  taskId: string;
  success: boolean;
  findings: string;
  filesExamined: string[];
  relevantCode: Array<{
    file: string;
    line: number;
    snippet: string;
  }>;
  duration: number;
}

/**
 * Aggregated exploration results
 */
export interface ExplorationSummary {
  tasks: ExplorationResult[];
  synthesizedFindings: string;
  keyFiles: string[];
  totalDuration: number;
}

/**
 * Options for parallel exploration
 */
export interface ParallelExplorationOptions {
  maxConcurrent?: number;
  timeout?: number;
  modelId: string;
  provider: ProviderName;
  workingDir: string;
  onProgress?: (completed: number, total: number) => void;
  onTaskComplete?: (result: ExplorationResult) => void;
}

/**
 * Default exploration tasks for understanding a codebase
 */
export const DEFAULT_EXPLORATION_TASKS: ExplorationTask[] = [
  {
    id: "structure",
    description: "Analyze project structure and understand the directory layout",
    filePatterns: ["package.json", "tsconfig.json", "*.config.*"],
  },
  {
    id: "entry-points",
    description: "Find main entry points and understand the application flow",
    filePatterns: ["**/main.*", "**/index.*", "**/app.*"],
    keywords: ["export", "main", "start"],
  },
  {
    id: "types",
    description: "Analyze type definitions and interfaces",
    filePatterns: ["**/types/**", "**/interfaces/**", "**/*.d.ts"],
  },
];

/**
 * Build exploration prompt for a task
 */
const buildExplorationPrompt = (task: ExplorationTask): string => {
  const parts = [`## Exploration Task: ${task.description}`];

  if (task.searchPatterns?.length) {
    parts.push(`\n### Search for patterns:\n${task.searchPatterns.map(p => `- ${p}`).join("\n")}`);
  }

  if (task.filePatterns?.length) {
    parts.push(`\n### Look in files matching:\n${task.filePatterns.map(p => `- ${p}`).join("\n")}`);
  }

  if (task.keywords?.length) {
    parts.push(`\n### Keywords to search:\n${task.keywords.map(k => `- ${k}`).join("\n")}`);
  }

  parts.push(`
### Instructions:
1. Use glob to find relevant files
2. Use grep to search for patterns
3. Use read to examine key files
4. Summarize your findings concisely

### Output Format:
Provide a structured summary:
- Key files found
- Important patterns discovered
- Relevant code locations (file:line)
- Dependencies and relationships
`);

  return parts.join("\n");
};

/**
 * Build exploration system prompt with params
 */
const buildExplorationSystemPrompt = (
  context: PromptContext,
): { prompt: string; params: { temperature?: number; topP?: number; maxTokens?: number } } => {
  const { prompt: basePrompt, params } = buildSystemPromptWithInfo(context);

  const fullPrompt = `${basePrompt}

## Exploration Mode

You are in EXPLORATION MODE. Your goal is to quickly understand the codebase.

### Exploration Rules:
1. USE ONLY read-only tools: glob, grep, read
2. DO NOT modify any files
3. DO NOT run bash commands that modify state
4. Focus on understanding, not changing

### Tool Usage:
- glob: Find files by pattern
- grep: Search file contents
- read: Examine file contents

### Output:
Provide clear, structured findings that help understand:
- What the code does
- How it's organized
- Key patterns and conventions
- Dependencies and relationships`;

  return { prompt: fullPrompt, params };
};

/**
 * Run a single exploration task
 */
const runExplorationTask = async (
  task: ExplorationTask,
  options: ParallelExplorationOptions,
): Promise<ExplorationResult> => {
  const startTime = Date.now();

  const context: PromptContext = {
    workingDir: options.workingDir,
    isGitRepo: true,
    platform: process.platform,
    today: new Date().toISOString().split("T")[0],
    modelId: options.modelId,
  };

  const { prompt: systemPrompt, params } = buildExplorationSystemPrompt(context);
  const userPrompt = buildExplorationPrompt(task);

  try {
    const result = await runAgent(userPrompt, systemPrompt, {
      provider: options.provider,
      model: options.modelId,
      autoApprove: true,
      maxIterations: 10,
      modelParams: {
        temperature: params.temperature,
        topP: params.topP,
        maxTokens: params.maxTokens,
      },
    });

    // Extract findings from result
    const filesExamined = extractFilesFromResult(result);
    const relevantCode = extractCodeLocations(result);

    return {
      taskId: task.id,
      success: result.success,
      findings: result.finalResponse,
      filesExamined,
      relevantCode,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      taskId: task.id,
      success: false,
      findings: error instanceof Error ? error.message : String(error),
      filesExamined: [],
      relevantCode: [],
      duration: Date.now() - startTime,
    };
  }
};

/**
 * Extract file paths from agent result
 */
const extractFilesFromResult = (result: AgentResult): string[] => {
  const files = new Set<string>();

  for (const { call } of result.toolCalls) {
    if (call.name === "read" && call.arguments.file_path) {
      files.add(String(call.arguments.file_path));
    }
    if (call.name === "glob" && call.arguments.pattern) {
      // Files are in the result, not the call
    }
  }

  // Also try to extract from the response text
  const filePattern = /(?:^|\s)([a-zA-Z0-9_\-/.]+\.[a-zA-Z]+)(?:\s|$|:)/g;
  let match;
  while ((match = filePattern.exec(result.finalResponse)) !== null) {
    if (match[1] && !match[1].startsWith("http")) {
      files.add(match[1]);
    }
  }

  return Array.from(files);
};

/**
 * Extract code locations from agent result
 */
const extractCodeLocations = (result: AgentResult): Array<{
  file: string;
  line: number;
  snippet: string;
}> => {
  const locations: Array<{ file: string; line: number; snippet: string }> = [];

  // Pattern: file.ts:123 or file.ts:123-456
  const locationPattern = /([a-zA-Z0-9_\-/.]+\.[a-zA-Z]+):(\d+)/g;
  let match;

  while ((match = locationPattern.exec(result.finalResponse)) !== null) {
    locations.push({
      file: match[1],
      line: parseInt(match[2], 10),
      snippet: "",
    });
  }

  return locations;
};

/**
 * Synthesize findings from multiple exploration results
 */
const synthesizeFindings = (results: ExplorationResult[]): string => {
  const sections: string[] = [];

  sections.push("# Exploration Summary\n");

  // Key findings from each task
  for (const result of results) {
    if (result.success) {
      sections.push(`## ${result.taskId}\n`);
      sections.push(result.findings);
      sections.push("");
    }
  }

  // Aggregate key files
  const allFiles = new Set<string>();
  for (const result of results) {
    result.filesExamined.forEach(f => allFiles.add(f));
  }

  if (allFiles.size > 0) {
    sections.push("## Key Files Discovered\n");
    sections.push(Array.from(allFiles).map(f => `- ${f}`).join("\n"));
  }

  return sections.join("\n");
};

/**
 * Run parallel exploration with multiple agents
 */
export const runParallelExploration = async (
  tasks: ExplorationTask[],
  options: ParallelExplorationOptions,
): Promise<ExplorationSummary> => {
  const startTime = Date.now();
  const maxConcurrent = options.maxConcurrent ?? 3;

  const results: ExplorationResult[] = [];
  const pending = [...tasks];
  const running: Promise<ExplorationResult>[] = [];

  let completed = 0;

  while (pending.length > 0 || running.length > 0) {
    // Start new tasks up to maxConcurrent
    while (pending.length > 0 && running.length < maxConcurrent) {
      const task = pending.shift()!;
      running.push(
        runExplorationTask(task, options).then(result => {
          completed++;
          options.onProgress?.(completed, tasks.length);
          options.onTaskComplete?.(result);
          return result;
        }),
      );
    }

    // Wait for at least one to complete
    if (running.length > 0) {
      const result = await Promise.race(
        running.map((p, i) => p.then(r => ({ result: r, index: i }))),
      );

      results.push(result.result);
      running.splice(result.index, 1);
    }
  }

  // Aggregate key files
  const keyFiles = new Set<string>();
  for (const result of results) {
    result.filesExamined.forEach(f => keyFiles.add(f));
  }

  return {
    tasks: results,
    synthesizedFindings: synthesizeFindings(results),
    keyFiles: Array.from(keyFiles),
    totalDuration: Date.now() - startTime,
  };
};

/**
 * Create exploration tasks for a specific goal
 */
export const createExplorationTasks = (
  goal: string,
  keywords: string[] = [],
): ExplorationTask[] => {
  return [
    {
      id: "goal-search",
      description: `Find code related to: ${goal}`,
      keywords: [goal, ...keywords],
    },
    {
      id: "related-files",
      description: `Find files that might be affected by changes to: ${goal}`,
      keywords: keywords.length > 0 ? keywords : [goal],
    },
    {
      id: "dependencies",
      description: `Understand dependencies and imports related to: ${goal}`,
      keywords: ["import", "require", "from", goal],
    },
  ];
};

/**
 * Quick exploration for a specific file or pattern
 */
export const quickExplore = async (
  pattern: string,
  options: Omit<ParallelExplorationOptions, "maxConcurrent">,
): Promise<ExplorationResult> => {
  const task: ExplorationTask = {
    id: "quick-explore",
    description: `Find and understand: ${pattern}`,
    filePatterns: [pattern],
  };

  return runExplorationTask(task, { ...options, maxConcurrent: 1 });
};
