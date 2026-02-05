/**
 * Planning functionality for task execution
 */

import chalk from "chalk";
import { chat as providerChat } from "@providers/core/chat";
import type { Message, ProviderName } from "@/types/providers";
import type {
  Plan,
  PlanStep,
  PlanStepStatus,
  PlanStepType,
} from "@/types/planner";
import { PLAN_SYSTEM_PROMPT } from "@prompts/system/planner";

/**
 * Status icon mapping
 */
const STATUS_ICONS: Record<PlanStepStatus, string> = {
  pending: chalk.gray("○"),
  in_progress: chalk.yellow("◐"),
  completed: chalk.green("●"),
  failed: chalk.red("✗"),
  skipped: chalk.gray("◌"),
};

/**
 * Type color mapping
 */
const TYPE_COLORS: Record<PlanStepType, (text: string) => string> = {
  read: chalk.blue,
  write: chalk.green,
  edit: chalk.yellow,
  execute: chalk.magenta,
  verify: chalk.cyan,
  analyze: chalk.gray,
};

/**
 * Step type detection patterns
 */
const STEP_TYPE_PATTERNS: Array<{ pattern: RegExp; type: PlanStepType }> = [
  { pattern: /\[READ\]/i, type: "read" },
  { pattern: /\[WRITE\]/i, type: "write" },
  { pattern: /\[EDIT\]/i, type: "edit" },
  { pattern: /\[EXECUTE\]/i, type: "execute" },
  { pattern: /\[RUN\]/i, type: "execute" },
  { pattern: /\[VERIFY\]/i, type: "verify" },
  { pattern: /\[TEST\]/i, type: "verify" },
  { pattern: /read|examine|check|look|review/i, type: "read" },
  { pattern: /create|write|add new/i, type: "write" },
  { pattern: /edit|modify|update|change/i, type: "edit" },
  { pattern: /run|execute|npm|yarn|command/i, type: "execute" },
  { pattern: /verify|test|confirm|ensure/i, type: "verify" },
];

/**
 * Current plan state
 */
let currentPlan: Plan | null = null;

/**
 * Generate unique plan ID
 */
const generatePlanId = (): string =>
  `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

/**
 * Detect step type from content
 */
const detectStepType = (content: string): PlanStepType => {
  for (const { pattern, type } of STEP_TYPE_PATTERNS) {
    if (pattern.test(content)) {
      return type;
    }
  }
  return "analyze";
};

/**
 * Extract target from step content
 */
const extractTarget = (content: string): string | undefined => {
  const fileMatch = content.match(/`([^`]+)`/);
  return fileMatch?.[1];
};

/**
 * Extract dependencies from step content
 */
const extractDependencies = (content: string): number[] => {
  const depMatch = content.match(
    /depends?\s*(?:on)?\s*(?:step)?\s*(\d+(?:\s*,\s*\d+)*)/i,
  );
  if (!depMatch) return [];

  return depMatch[1]
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d));
};

/**
 * Clean step description
 */
const cleanDescription = (content: string): string =>
  content
    .replace(/\[(READ|WRITE|EDIT|EXECUTE|RUN|VERIFY|TEST|ANALYZE)\]/gi, "")
    .trim();

/**
 * Parse LLM response into a structured plan
 */
const parsePlanResponse = (content: string, task: string): Plan => {
  const lines = content.split("\n");
  const steps: PlanStep[] = [];
  let title = task;
  let description = "";
  let stepId = 0;
  let collectDescription = true;

  for (const line of lines) {
    const trimmed = line.trim();

    // Extract title (first heading or first line)
    if (trimmed.startsWith("#")) {
      title = trimmed.replace(/^#+\s*/, "");
      continue;
    }

    // Look for numbered steps
    const stepMatch = trimmed.match(/^(\d+)[.)]\s*(.+)/);
    if (stepMatch) {
      collectDescription = false;
      stepId++;

      const stepContent = stepMatch[2];
      const type = detectStepType(stepContent);
      const target = extractTarget(stepContent);
      const dependencies = extractDependencies(stepContent);

      steps.push({
        id: stepId,
        description: cleanDescription(stepContent),
        type,
        target,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
        status: "pending",
      });
    } else if (collectDescription && trimmed && !trimmed.startsWith("-")) {
      description += (description ? " " : "") + trimmed;
    }
  }

  return {
    id: generatePlanId(),
    title,
    description,
    steps,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: "draft",
  };
};

/**
 * Generate a plan for a task
 */
export const createPlan = async (
  task: string,
  context?: string,
  provider?: ProviderName,
  model?: string,
): Promise<Plan> => {
  const messages: Message[] = [
    { role: "system", content: PLAN_SYSTEM_PROMPT },
    {
      role: "user",
      content: context
        ? `Context:\n${context}\n\nTask: ${task}`
        : `Task: ${task}`,
    },
  ];

  console.log(chalk.gray("Generating plan..."));

  const targetProvider = provider ?? "copilot";
  const response = await providerChat(targetProvider, messages, { model });
  const planContent = response.content ?? "";

  const plan = parsePlanResponse(planContent, task);
  currentPlan = plan;

  return plan;
};

/**
 * Display a plan in the terminal
 */
export const displayPlan = (plan: Plan): void => {
  console.log("\n" + chalk.bold.cyan("═══ Execution Plan ═══"));
  console.log(chalk.bold(plan.title));
  if (plan.description) {
    console.log(chalk.gray(plan.description));
  }
  console.log("");

  for (const step of plan.steps) {
    const statusIcon = STATUS_ICONS[step.status] ?? chalk.gray("?");
    const typeColor = TYPE_COLORS[step.type] ?? chalk.gray;

    console.log(
      `${statusIcon} ${chalk.bold(`Step ${step.id}:`)} ${typeColor(`[${step.type.toUpperCase()}]`)} ${step.description}`,
    );

    if (step.target) {
      console.log(`   ${chalk.gray("Target:")} ${step.target}`);
    }

    if (step.dependencies && step.dependencies.length > 0) {
      console.log(
        `   ${chalk.gray("Depends on:")} ${step.dependencies.map((d) => `Step ${d}`).join(", ")}`,
      );
    }

    if (step.error) {
      console.log(`   ${chalk.red("Error:")} ${step.error}`);
    }
  }

  console.log("\n" + chalk.gray("─".repeat(50)));
  console.log(chalk.gray(`Plan ID: ${plan.id}`));
  console.log(chalk.gray(`Status: ${plan.status}`));
  console.log("");
};

/**
 * Get current plan
 */
export const getCurrentPlan = (): Plan | null => currentPlan;

/**
 * Approve current plan
 */
export const approvePlan = (): void => {
  if (currentPlan) {
    currentPlan.status = "approved";
    currentPlan.updatedAt = Date.now();
  }
};

/**
 * Update step status
 */
export const updateStepStatus = (
  stepId: number,
  status: PlanStepStatus,
  result?: string,
  error?: string,
): void => {
  if (!currentPlan) return;

  const step = currentPlan.steps.find((s) => s.id === stepId);
  if (step) {
    step.status = status;
    if (result) step.result = result;
    if (error) step.error = error;
    currentPlan.updatedAt = Date.now();

    // Update plan status
    const allCompleted = currentPlan.steps.every(
      (s) => s.status === "completed" || s.status === "skipped",
    );
    const anyFailed = currentPlan.steps.some((s) => s.status === "failed");
    const anyInProgress = currentPlan.steps.some(
      (s) => s.status === "in_progress",
    );

    if (allCompleted) {
      currentPlan.status = "completed";
    } else if (anyFailed) {
      currentPlan.status = "failed";
    } else if (anyInProgress) {
      currentPlan.status = "in_progress";
    }
  }
};

/**
 * Get next executable step
 */
export const getNextStep = (): PlanStep | null => {
  if (!currentPlan) return null;

  for (const step of currentPlan.steps) {
    if (step.status !== "pending") continue;

    // Check if dependencies are satisfied
    if (step.dependencies) {
      const depsCompleted = step.dependencies.every((depId) => {
        const dep = currentPlan!.steps.find((s) => s.id === depId);
        return dep && (dep.status === "completed" || dep.status === "skipped");
      });

      if (!depsCompleted) continue;
    }

    return step;
  }

  return null;
};

// Re-export types
export type {
  Plan,
  PlanStep,
  PlanStepType,
  PlanStepStatus,
} from "@/types/planner";
